-- Update the flush_production_data function to accept p_include_demo_data parameter (fixed syntax)
CREATE OR REPLACE FUNCTION public.flush_production_data(
  p_confirmation_text text DEFAULT NULL::text, 
  p_keep_super_admin boolean DEFAULT true,
  p_include_demo_data boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_super_admin_id uuid;
  v_deleted_verifications int := 0;
  v_deleted_claims int := 0;
  v_deleted_entries int := 0;
  v_deleted_competitions int := 0;
  v_deleted_staff_codes int := 0;
  v_deleted_staff int := 0;
  v_deleted_venues int := 0;
  v_deleted_banking int := 0;
  v_deleted_payments int := 0;
  v_deleted_leads int := 0;
  v_deleted_clubs int := 0;
  v_anonymized_profiles int := 0;
  v_deleted_files int := 0;
  v_deleted_attempts int := 0;
BEGIN
  -- Environment and access checks
  IF NOT public.is_production_environment() THEN
    RAISE EXCEPTION 'This function can only be executed in production environment';
  END IF;

  IF NOT public.get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  IF p_confirmation_text != 'FLUSH_PRODUCTION_DATA_CONFIRMED' THEN
    RAISE EXCEPTION 'Invalid confirmation text. Must be exactly: FLUSH_PRODUCTION_DATA_CONFIRMED';
  END IF;

  IF p_keep_super_admin THEN
    SELECT id INTO v_super_admin_id 
    FROM public.profiles 
    WHERE role = 'SUPER_ADMIN' AND email = 'admin@holein1.test'
    LIMIT 1;
  END IF;

  -- Delete dependent entry-related data first
  -- If p_include_demo_data is true, delete everything including demo data
  IF p_include_demo_data THEN
    -- Delete ALL entries including demo data
    DELETE FROM public.verifications;
    GET DIAGNOSTICS v_deleted_verifications = ROW_COUNT;

    DELETE FROM public.staff_code_attempts;
    GET DIAGNOSTICS v_deleted_attempts = ROW_COUNT;

    DELETE FROM public.claims;
    GET DIAGNOSTICS v_deleted_claims = ROW_COUNT;

    DELETE FROM public.entries;
    GET DIAGNOSTICS v_deleted_entries = ROW_COUNT;

    -- Delete ALL auxiliary data
    DELETE FROM public.staff_codes;
    GET DIAGNOSTICS v_deleted_staff_codes = ROW_COUNT;

    DELETE FROM public.staff;
    GET DIAGNOSTICS v_deleted_staff = ROW_COUNT;

    DELETE FROM public.venues;
    GET DIAGNOSTICS v_deleted_venues = ROW_COUNT;

    DELETE FROM public.club_banking;
    GET DIAGNOSTICS v_deleted_banking = ROW_COUNT;

    DELETE FROM public.club_payments;
    GET DIAGNOSTICS v_deleted_payments = ROW_COUNT;

    DELETE FROM public.leads;
    GET DIAGNOSTICS v_deleted_leads = ROW_COUNT;

    -- Delete ALL competitions including demo
    DELETE FROM public.competitions;
    GET DIAGNOSTICS v_deleted_competitions = ROW_COUNT;

    -- Delete ALL uploaded files except super admin
    DELETE FROM public.uploaded_files uf
    WHERE (v_super_admin_id IS NULL OR uf.user_id <> v_super_admin_id);
    GET DIAGNOSTICS v_deleted_files = ROW_COUNT;

    -- Anonymize and soft-delete ALL profiles except super admin
    UPDATE public.profiles p
    SET 
      status = 'deleted',
      deleted_at = now(),
      updated_at = now(),
      club_id = NULL,
      email = 'deleted+' || left(p.id::text, 8) || '@holein1.test',
      first_name = NULL,
      last_name = NULL,
      phone = NULL,
      phone_e164 = NULL,
      gender = NULL,
      age_years = NULL,
      handicap = NULL,
      consent_marketing = false
    WHERE (v_super_admin_id IS NULL OR p.id <> v_super_admin_id);
    GET DIAGNOSTICS v_anonymized_profiles = ROW_COUNT;

    -- Delete ALL clubs including demo
    DELETE FROM public.clubs;
    GET DIAGNOSTICS v_deleted_clubs = ROW_COUNT;
  ELSE
    -- Original behavior: keep demo data, delete only non-demo data
    DELETE FROM public.verifications v
    USING public.entries e
    WHERE v.entry_id = e.id
      AND COALESCE(e.is_demo_data, false) = false;
    GET DIAGNOSTICS v_deleted_verifications = ROW_COUNT;

    DELETE FROM public.staff_code_attempts sca
    USING public.entries e
    WHERE sca.entry_id = e.id
      AND COALESCE(e.is_demo_data, false) = false;
    GET DIAGNOSTICS v_deleted_attempts = ROW_COUNT;

    DELETE FROM public.claims c
    USING public.entries e
    WHERE c.entry_id = e.id
      AND COALESCE(e.is_demo_data, false) = false;
    GET DIAGNOSTICS v_deleted_claims = ROW_COUNT;

    DELETE FROM public.entries
    WHERE COALESCE(is_demo_data, false) = false;
    GET DIAGNOSTICS v_deleted_entries = ROW_COUNT;

    -- Delete club-linked auxiliary data for non-demo clubs
    DELETE FROM public.staff_codes sc
    WHERE sc.club_id IN (
      SELECT id FROM public.clubs WHERE COALESCE(is_demo_data, false) = false
    );
    GET DIAGNOSTICS v_deleted_staff_codes = ROW_COUNT;

    DELETE FROM public.staff s
    WHERE s.club_id IN (
      SELECT id FROM public.clubs WHERE COALESCE(is_demo_data, false) = false
    );
    GET DIAGNOSTICS v_deleted_staff = ROW_COUNT;

    DELETE FROM public.venues v
    WHERE v.club_id IN (
      SELECT id FROM public.clubs WHERE COALESCE(is_demo_data, false) = false
    );
    GET DIAGNOSTICS v_deleted_venues = ROW_COUNT;

    DELETE FROM public.club_banking b
    WHERE b.club_id IN (
      SELECT id FROM public.clubs WHERE COALESCE(is_demo_data, false) = false
    );
    GET DIAGNOSTICS v_deleted_banking = ROW_COUNT;

    DELETE FROM public.club_payments p
    WHERE p.club_id IN (
      SELECT id FROM public.clubs WHERE COALESCE(is_demo_data, false) = false
    );
    GET DIAGNOSTICS v_deleted_payments = ROW_COUNT;

    DELETE FROM public.leads l
    WHERE l.club_id IN (
      SELECT id FROM public.clubs WHERE COALESCE(is_demo_data, false) = false
    );
    GET DIAGNOSTICS v_deleted_leads = ROW_COUNT;

    -- Delete non-demo competitions after entries are gone
    DELETE FROM public.competitions
    WHERE COALESCE(is_demo_data, false) = false;
    GET DIAGNOSTICS v_deleted_competitions = ROW_COUNT;

    -- Delete uploaded files for non-demo users (except super admin)
    DELETE FROM public.uploaded_files uf
    WHERE uf.user_id IN (
      SELECT id FROM public.profiles 
      WHERE COALESCE(is_demo_data, false) = false
        AND (v_super_admin_id IS NULL OR id <> v_super_admin_id)
    );
    GET DIAGNOSTICS v_deleted_files = ROW_COUNT;

    -- Anonymize and soft-delete non-demo profiles (cannot hard-delete due to RLS and policies)
    UPDATE public.profiles p
    SET 
      status = 'deleted',
      deleted_at = now(),
      updated_at = now(),
      club_id = NULL,
      email = 'deleted+' || left(p.id::text, 8) || '@holein1.test',
      first_name = NULL,
      last_name = NULL,
      phone = NULL,
      phone_e164 = NULL,
      gender = NULL,
      age_years = NULL,
      handicap = NULL,
      consent_marketing = false
    WHERE COALESCE(p.is_demo_data, false) = false
      AND (v_super_admin_id IS NULL OR p.id <> v_super_admin_id);
    GET DIAGNOSTICS v_anonymized_profiles = ROW_COUNT;

    -- Finally delete non-demo clubs (FKs are cleared now)
    DELETE FROM public.clubs
    WHERE COALESCE(is_demo_data, false) = false;
    GET DIAGNOSTICS v_deleted_clubs = ROW_COUNT;
  END IF;

  -- Audit log for the flush
  INSERT INTO public.audit_events (
    entity_type, entity_id, action, new_values, user_id, created_at
  ) VALUES (
    'system_flush',
    v_super_admin_id,
    'FLUSH_PRODUCTION_DATA',
    jsonb_build_object(
      'deleted_entries', v_deleted_entries,
      'deleted_claims', v_deleted_claims,
      'deleted_verifications', v_deleted_verifications,
      'deleted_competitions', v_deleted_competitions,
      'deleted_staff_codes', v_deleted_staff_codes,
      'deleted_staff', v_deleted_staff,
      'deleted_venues', v_deleted_venues,
      'deleted_banking', v_deleted_banking,
      'deleted_payments', v_deleted_payments,
      'deleted_leads', v_deleted_leads,
      'deleted_clubs', v_deleted_clubs,
      'deleted_files', v_deleted_files,
      'deleted_attempts', v_deleted_attempts,
      'anonymized_profiles', v_anonymized_profiles,
      'include_demo_data', p_include_demo_data
    ),
    auth.uid(),
    now()
  );

  RETURN jsonb_build_object(
    'deleted_entries', v_deleted_entries,
    'deleted_claims', v_deleted_claims,
    'deleted_verifications', v_deleted_verifications,
    'deleted_competitions', v_deleted_competitions,
    'deleted_staff_codes', v_deleted_staff_codes,
    'deleted_staff', v_deleted_staff,
    'deleted_venues', v_deleted_venues,
    'deleted_banking', v_deleted_banking,
    'deleted_payments', v_deleted_payments,
    'deleted_leads', v_deleted_leads,
    'deleted_clubs', v_deleted_clubs,
    'deleted_files', v_deleted_files,
    'deleted_attempts', v_deleted_attempts,
    'anonymized_profiles', v_anonymized_profiles,
    'include_demo_data', p_include_demo_data,
    'message', CASE 
      WHEN p_include_demo_data THEN 'All data including demo data flushed; only super admin preserved'
      ELSE 'Non-demo data flushed; demo data and super admin preserved'
    END
  );
END;
$function$;