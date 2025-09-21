-- Update RPC to be safer and return profile_created
CREATE OR REPLACE FUNCTION public.convert_partnership_lead_to_club(
  p_lead_id uuid,
  p_club_name text DEFAULT NULL::text,
  p_admin_email text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role text;
  v_lead RECORD;
  v_club_id uuid;
  v_final_club_name text;
  v_admin_email text;
  v_profile_id uuid;
  v_admin_user_id uuid;
  v_profile_created boolean := false;
BEGIN
  -- 1) Auth check
  v_role := public.get_current_user_role();
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

  -- 5) (Try) upsert profile as CLUB admin - only if auth.users row exists
  BEGIN
    SELECT u.id INTO v_admin_user_id
    FROM auth.users u
    WHERE u.email = LOWER(TRIM(v_admin_email))
    LIMIT 1;

    IF v_admin_user_id IS NOT NULL THEN
      -- Safe upsert using helper, then ensure role/club
      PERFORM public.upsert_profile_safe(
        v_admin_user_id,
        LOWER(TRIM(v_admin_email)),
        COALESCE(split_part(v_lead.name, ' ', 1), ''),
        COALESCE(NULLIF(split_part(v_lead.name, ' ', 2), ''), ''),
        NULL,
        NULL,
        'CLUB'::public.user_role
      );

      UPDATE public.profiles 
      SET role = 'CLUB', club_id = v_club_id, updated_at = now()
      WHERE id = v_admin_user_id;

      SELECT id INTO v_profile_id FROM public.profiles WHERE id = v_admin_user_id;
      v_profile_created := v_profile_id IS NOT NULL;
    END IF;
  EXCEPTION 
    WHEN foreign_key_violation THEN
      -- If profiles.id lacks matching auth.users, do not abort the tx
      RAISE NOTICE 'Profile creation skipped for %, no matching auth.users record', v_admin_email;
      v_profile_created := false;
  END;

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
      'club_name', v_final_club_name,
      'profile_created', v_profile_created
    ), 
    auth.uid(),
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'lead_id', p_lead_id,
    'club_id', v_club_id,
    'club_name', v_final_club_name,
    'admin_email', v_admin_email,
    'profile_created', v_profile_created
  );
END;
$function$;