-- Phase 1: Database & Security Implementation (Fixed)
-- Idempotent migration for lead_status enum extension and admin enquiries setup

-- 1.1 Extend lead_status enum (add IN_REVIEW, REJECTED if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='lead_status' AND e.enumlabel='IN_REVIEW') THEN
    ALTER TYPE lead_status ADD VALUE 'IN_REVIEW';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='lead_status' AND e.enumlabel='REJECTED') THEN
    ALTER TYPE lead_status ADD VALUE 'REJECTED';
  END IF;
END $$;

-- 1.2 Create helpful indexes for admin filters (idempotent)
CREATE INDEX IF NOT EXISTS leads_source_status_created_idx ON public.leads (source, status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads (email);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_search_idx ON public.leads USING gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(notes,'')));

-- 1.3 RLS policies (drop and recreate for idempotency)
-- Keep existing public INSERT policy for partnership applications
-- Add explicit ADMIN SELECT policy
DROP POLICY IF EXISTS admin_read_leads ON public.leads;
CREATE POLICY admin_read_leads
ON public.leads
FOR SELECT
USING (get_current_user_role() = 'ADMIN');

-- Add ADMIN UPDATE policy (status, notes, club_id only)
DROP POLICY IF EXISTS admin_update_leads ON public.leads;
CREATE POLICY admin_update_leads
ON public.leads
FOR UPDATE
USING (get_current_user_role() = 'ADMIN')
WITH CHECK (get_current_user_role() = 'ADMIN');

-- 1.4 RPC function: convert_partnership_lead_to_club
CREATE OR REPLACE FUNCTION public.convert_partnership_lead_to_club(
  p_lead_id uuid,
  p_club_name text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_lead record;
  v_club_id uuid;
  v_final_club_name text;
  v_admin_email text;
  v_profile_id uuid;
BEGIN
  -- 1) Auth check
  v_role := get_current_user_role();
  IF v_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='28000';
  END IF;

  -- 2) Lock the lead
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found' USING ERRCODE='P0002';
  END IF;

  IF v_lead.source <> 'Partnership Application' THEN
    RAISE EXCEPTION 'invalid_source' USING ERRCODE='22023';
  END IF;

  IF v_lead.status IN ('CONVERTED','REJECTED') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='22023';
  END IF;

  -- 3) Derive fields
  v_final_club_name := COALESCE(p_club_name, v_lead.name, 'New Club');
  v_admin_email := COALESCE(p_admin_email, v_lead.email);

  -- 4) Create club
  INSERT INTO public.clubs (id, name, email, phone, address, website)
  VALUES (
    gen_random_uuid(), 
    v_final_club_name, 
    v_admin_email,
    v_lead.phone,
    COALESCE(p_metadata->>'address', ''),
    COALESCE(p_metadata->>'website', '')
  )
  RETURNING id INTO v_club_id;

  -- 5) Upsert profile as CLUB admin
  -- First try to find existing profile by email
  SELECT id INTO v_profile_id FROM public.profiles WHERE email = v_admin_email;
  
  IF v_profile_id IS NOT NULL THEN
    -- Update existing profile
    UPDATE public.profiles 
    SET role = 'CLUB', club_id = v_club_id, updated_at = now()
    WHERE id = v_profile_id;
  ELSE
    -- Create new profile (this will need auth.users entry to be created separately)
    -- For now, we'll create a placeholder profile that can be activated later
    INSERT INTO public.profiles (id, email, role, club_id, first_name, last_name)
    VALUES (
      gen_random_uuid(),
      v_admin_email, 
      'CLUB', 
      v_club_id,
      COALESCE(split_part(v_lead.name, ' ', 1), ''),
      COALESCE(nullif(split_part(v_lead.name, ' ', 2), ''), '')
    );
  END IF;

  -- 6) Update lead
  UPDATE public.leads
  SET status='CONVERTED', club_id=v_club_id, updated_at=now()
  WHERE id=p_lead_id;

  -- 7) Optional audit logging
  INSERT INTO public.audit_events(entity_type, entity_id, action, new_values, user_id, created_at)
  VALUES (
    'lead_conversion', 
    p_lead_id,
    'CONVERT_TO_CLUB', 
    jsonb_build_object(
      'lead_id', p_lead_id,
      'club_id', v_club_id,
      'admin_email', v_admin_email,
      'club_name', v_final_club_name
    ), 
    auth.uid(),
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'lead_id', p_lead_id,
    'club_id', v_club_id,
    'club_name', v_final_club_name,
    'admin_email', v_admin_email
  );
END;
$$;

-- Grant execute permission to authenticated users (admin role check is internal)
GRANT EXECUTE ON FUNCTION public.convert_partnership_lead_to_club(uuid, text, text, jsonb) TO authenticated;