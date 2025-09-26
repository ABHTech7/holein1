-- Fix the incomplete flush_production_data function
CREATE OR REPLACE FUNCTION public.flush_production_data(
  p_confirmation_text text DEFAULT NULL,
  p_keep_super_admin boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_clubs integer := 0;
  deleted_players integer := 0;
  deleted_entries integer := 0;
  deleted_competitions integer := 0;
  deleted_verifications integer := 0;
  deleted_claims integer := 0;
  super_admin_id uuid;
BEGIN
  -- CRITICAL: Only allow on production environment
  IF NOT is_production_environment() THEN
    RAISE EXCEPTION 'This function can only be executed in production environment';
  END IF;

  -- Check admin access
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - super admin required';
  END IF;

  -- Require confirmation text
  IF p_confirmation_text != 'FLUSH_PRODUCTION_DATA_CONFIRMED' THEN
    RAISE EXCEPTION 'Invalid confirmation text. Must be exactly: FLUSH_PRODUCTION_DATA_CONFIRMED';
  END IF;

  -- Get super admin ID to preserve
  IF p_keep_super_admin THEN
    SELECT id INTO super_admin_id 
    FROM profiles 
    WHERE role = 'SUPER_ADMIN' 
    AND email = 'admin@holein1.test'
    LIMIT 1;
  END IF;

  -- Delete non-demo data in correct order (respecting foreign keys)
  
  -- Delete verifications first
  DELETE FROM verifications 
  WHERE entry_id IN (
    SELECT e.id FROM entries e 
    WHERE COALESCE(e.is_demo_data, false) = false
  );
  GET DIAGNOSTICS deleted_verifications = ROW_COUNT;

  -- Delete claims
  DELETE FROM claims 
  WHERE entry_id IN (
    SELECT e.id FROM entries e 
    WHERE COALESCE(e.is_demo_data, false) = false
  );
  GET DIAGNOSTICS deleted_claims = ROW_COUNT;

  -- Delete non-demo entries
  DELETE FROM entries 
  WHERE COALESCE(is_demo_data, false) = false;
  GET DIAGNOSTICS deleted_entries = ROW_COUNT;

  -- Delete non-demo competitions  
  DELETE FROM competitions 
  WHERE COALESCE(is_demo_data, false) = false;
  GET DIAGNOSTICS deleted_competitions = ROW_COUNT;

  -- Delete non-demo clubs
  DELETE FROM clubs 
  WHERE COALESCE(is_demo_data, false) = false;
  GET DIAGNOSTICS deleted_clubs = ROW_COUNT;

  -- Delete non-demo player profiles (but keep super admin)
  DELETE FROM profiles 
  WHERE COALESCE(is_demo_data, false) = false 
  AND role = 'PLAYER';
  GET DIAGNOSTICS deleted_players = ROW_COUNT;

  -- Log the flush operation
  INSERT INTO audit_events (
    entity_type,
    entity_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'production_data_flush',
    auth.uid(),
    'FLUSH',
    jsonb_build_object(
      'deleted_clubs', deleted_clubs,
      'deleted_players', deleted_players,
      'deleted_entries', deleted_entries,
      'deleted_competitions', deleted_competitions,
      'deleted_verifications', deleted_verifications,
      'deleted_claims', deleted_claims,
      'super_admin_preserved', super_admin_id IS NOT NULL,
      'confirmation_provided', true
    ),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_clubs', deleted_clubs,
    'deleted_players', deleted_players,
    'deleted_entries', deleted_entries,
    'deleted_competitions', deleted_competitions,
    'deleted_verifications', deleted_verifications,
    'deleted_claims', deleted_claims,
    'super_admin_preserved', super_admin_id IS NOT NULL,
    'message', 'Production data flushed successfully. Only demo data and super admin remain.'
  );
END;
$$;