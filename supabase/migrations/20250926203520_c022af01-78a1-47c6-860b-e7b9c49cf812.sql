-- Fix security issues: Add missing search_path settings to functions

-- Fix admin_update_own_profile function
CREATE OR REPLACE FUNCTION public.admin_update_own_profile(
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_role user_role;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is SUPER_ADMIN
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  
  IF v_role != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Access denied - Super Admin required';
  END IF;

  -- Update profile
  UPDATE profiles 
  SET 
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    updated_at = now()
  WHERE id = v_user_id;

  -- Log the change
  INSERT INTO audit_events (
    entity_type,
    entity_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'admin_profile_update',
    v_user_id,
    'UPDATE',
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'phone', p_phone
    ),
    v_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile updated successfully'
  );
END;
$function$;

-- Fix admin_delete_player function  
CREATE OR REPLACE FUNCTION public.admin_delete_player(
  p_player_id uuid,
  p_reason text DEFAULT 'Admin deletion'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_player_email text;
  v_deleted_entries integer := 0;
  v_deleted_verifications integer := 0;
  v_deleted_claims integer := 0;
BEGIN
  -- Check admin access
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Get player email for logging
  SELECT email INTO v_player_email FROM profiles WHERE id = p_player_id AND role = 'PLAYER';
  
  IF v_player_email IS NULL THEN
    RAISE EXCEPTION 'Player not found or not a player role';
  END IF;

  -- Delete related records (cascade)
  -- Delete verifications first
  DELETE FROM verifications 
  WHERE entry_id IN (SELECT id FROM entries WHERE player_id = p_player_id);
  GET DIAGNOSTICS v_deleted_verifications = ROW_COUNT;

  -- Delete claims
  DELETE FROM claims 
  WHERE entry_id IN (SELECT id FROM entries WHERE player_id = p_player_id);
  GET DIAGNOSTICS v_deleted_claims = ROW_COUNT;

  -- Delete entries
  DELETE FROM entries WHERE player_id = p_player_id;
  GET DIAGNOSTICS v_deleted_entries = ROW_COUNT;

  -- Delete uploaded files
  DELETE FROM uploaded_files WHERE user_id = p_player_id;

  -- Soft delete the profile
  UPDATE profiles 
  SET 
    status = 'deleted',
    deleted_at = now(),
    updated_at = now()
  WHERE id = p_player_id;

  -- Log the deletion
  INSERT INTO audit_events (
    entity_type,
    entity_id,
    action,
    old_values,
    user_id
  ) VALUES (
    'player_deletion',
    p_player_id,
    'DELETE',
    jsonb_build_object(
      'email', v_player_email,
      'reason', p_reason,
      'deleted_entries', v_deleted_entries,
      'deleted_verifications', v_deleted_verifications,
      'deleted_claims', v_deleted_claims
    ),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'player_email', v_player_email,
    'deleted_entries', v_deleted_entries,
    'deleted_verifications', v_deleted_verifications,
    'deleted_claims', v_deleted_claims,
    'message', 'Player and all related data deleted successfully'
  );
END;
$function$;

-- Fix admin_delete_admin_user function
CREATE OR REPLACE FUNCTION public.admin_delete_admin_user(
  p_user_id uuid,
  p_reason text DEFAULT 'Admin deletion'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_user RECORD;
  v_current_user_role user_role;
  v_super_admin_count integer;
BEGIN
  -- Check if current user is SUPER_ADMIN
  SELECT role INTO v_current_user_role FROM profiles WHERE id = auth.uid();
  
  IF v_current_user_role != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Access denied - Super Admin required';
  END IF;

  -- Prevent self-deletion
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Get target user info
  SELECT * INTO v_target_user FROM profiles WHERE id = p_user_id;
  
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if target is admin or club role
  IF v_target_user.role NOT IN ('ADMIN', 'SUPER_ADMIN', 'CLUB') THEN
    RAISE EXCEPTION 'Can only delete Admin, Super Admin, or Club users';
  END IF;

  -- Ensure at least one SUPER_ADMIN remains
  IF v_target_user.role = 'SUPER_ADMIN' THEN
    SELECT COUNT(*) INTO v_super_admin_count FROM profiles WHERE role = 'SUPER_ADMIN' AND status = 'active';
    
    IF v_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the last Super Admin';
    END IF;
  END IF;

  -- Handle club user - archive their clubs
  IF v_target_user.role = 'CLUB' THEN
    UPDATE clubs 
    SET 
      archived = true,
      updated_at = now()
    WHERE id = v_target_user.club_id;
  END IF;

  -- Delete admin permissions
  DELETE FROM admin_user_permissions WHERE user_id = p_user_id;

  -- Soft delete the user profile
  UPDATE profiles 
  SET 
    status = 'deleted',
    deleted_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  -- Log the deletion
  INSERT INTO audit_events (
    entity_type,
    entity_id,
    action,
    old_values,
    user_id
  ) VALUES (
    'admin_user_deletion',
    p_user_id,
    'DELETE',
    jsonb_build_object(
      'target_email', v_target_user.email,
      'target_role', v_target_user.role,
      'reason', p_reason,
      'club_id', v_target_user.club_id
    ),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_user_email', v_target_user.email,
    'deleted_user_role', v_target_user.role,
    'message', 'Admin user deleted successfully'
  );
END;
$function$;

-- Fix is_production_environment function
CREATE OR REPLACE FUNCTION public.is_production_environment()
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if we're on a production domain
  -- Add your actual production domains here
  RETURN current_setting('request.headers', true)::json->>'host' LIKE '%.com'
    OR current_setting('request.headers', true)::json->>'host' LIKE 'holein1.%'
    OR current_setting('request.headers', true)::json->>'host' NOT LIKE '%.lovableproject.com';
EXCEPTION WHEN OTHERS THEN
  -- If we can't determine, assume production for safety
  RETURN true;
END;
$function$;