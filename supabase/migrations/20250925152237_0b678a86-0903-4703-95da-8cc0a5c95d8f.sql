-- 1) Allow SUPER_ADMIN in convert_partnership_lead_to_club
CREATE OR REPLACE FUNCTION public.convert_partnership_lead_to_club(
  p_lead_id uuid,
  p_club_name text DEFAULT NULL::text,
  p_admin_email text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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
  -- 1) Auth check (accept ADMIN or SUPER_ADMIN)
  IF NOT public.get_current_user_is_admin() THEN
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

-- 2) Allow SUPER_ADMIN in get_incomplete_players
CREATE OR REPLACE FUNCTION public.get_incomplete_players()
RETURNS TABLE(
  id uuid, email text, first_name text, last_name text, created_at timestamptz,
  has_success_payment boolean, has_paid_entry boolean, onboarding_complete boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is ADMIN (including SUPER_ADMIN)
  IF NOT public.get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.created_at,
    COALESCE(payment_stats.has_success_payment, false) as has_success_payment,
    COALESCE(entry_stats.has_paid_entry, false) as has_paid_entry,
    COALESCE(p.age_years IS NOT NULL AND p.phone IS NOT NULL, false) as onboarding_complete
  FROM profiles p
  LEFT JOIN (
    -- Check for successful payments (placeholder - always false for now)
    SELECT 
      p.id as player_id,
      false as has_success_payment
    FROM profiles p
    WHERE p.role = 'PLAYER'
  ) payment_stats ON p.id = payment_stats.player_id
  LEFT JOIN (
    -- Check for paid/completed entries
    SELECT 
      e.player_id,
      bool_or(e.paid = true OR e.status IN ('paid', 'completed')) as has_paid_entry
    FROM entries e
    GROUP BY e.player_id
  ) entry_stats ON p.id = entry_stats.player_id
  WHERE p.role = 'PLAYER'
    AND p.status != 'deleted'  -- Exclude soft-deleted players
    AND (
      (COALESCE(payment_stats.has_success_payment, false) = false)
      AND 
      (COALESCE(entry_stats.has_paid_entry, false) = false OR COALESCE(p.age_years IS NOT NULL AND p.phone IS NOT NULL, false) = false)
    );
END;
$function$;

-- 3) Allow SUPER_ADMIN in update_club_contract_status
CREATE OR REPLACE FUNCTION public.update_club_contract_status(
  p_club_id uuid,
  p_signed boolean,
  p_signed_by_name text DEFAULT NULL::text,
  p_signed_by_email text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role public.user_role;
  v_user_id uuid;
  v_is_owner boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE='28000';
  END IF;

  v_role := public.get_current_user_role();
  v_is_owner := (public.get_current_user_club_id() = p_club_id);

  -- Allow admins (including SUPER_ADMIN) or club owner
  IF NOT (public.get_current_user_is_admin() OR (v_role = 'CLUB' AND v_is_owner)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='28000';
  END IF;

  IF p_signed THEN
    UPDATE public.clubs
    SET 
      contract_signed = true,
      contract_signed_date = now(),
      contract_signed_by_name = COALESCE(p_signed_by_name, contract_signed_by_name),
      contract_signed_by_email = COALESCE(p_signed_by_email, contract_signed_by_email),
      updated_at = now()
    WHERE id = p_club_id;
  ELSE
    UPDATE public.clubs
    SET 
      contract_signed = false,
      contract_signed_date = NULL,
      contract_signed_by_name = NULL,
      contract_signed_by_email = NULL,
      updated_at = now()
    WHERE id = p_club_id;
  END IF;

  RETURN true;
END;
$function$;