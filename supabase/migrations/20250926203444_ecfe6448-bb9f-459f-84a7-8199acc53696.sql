-- Fix top_up_demo_entries function to use existing users instead of creating fake profiles
CREATE OR REPLACE FUNCTION public.top_up_demo_entries(p_target_count integer DEFAULT 1322)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_entry_count integer;
  needed_entries integer;
  inserted_entries integer := 0;
  competition_count integer;
  existing_user_count integer;
BEGIN
  -- Check admin access
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Get current counts
  SELECT COUNT(*) INTO current_entry_count FROM entries WHERE is_demo_data = true;
  SELECT COUNT(*) INTO competition_count FROM competitions WHERE archived = false;
  SELECT COUNT(*) INTO existing_user_count FROM profiles WHERE role IN ('PLAYER', 'CLUB', 'ADMIN') AND status = 'active';

  -- Calculate needed entries
  needed_entries := GREATEST(0, p_target_count - current_entry_count);

  -- Ensure we have competitions and users to work with
  IF competition_count = 0 THEN
    RAISE EXCEPTION 'No active competitions found for demo entries';
  END IF;

  IF existing_user_count = 0 THEN
    RAISE EXCEPTION 'No existing users found for demo entries';
  END IF;

  -- Create demo entries using existing user profiles
  IF needed_entries > 0 THEN
    INSERT INTO entries (
      id,
      competition_id,
      player_id,
      email,
      entry_date,
      paid,
      price_paid,
      status,
      outcome_self,
      is_demo_data,
      attempt_number,
      is_repeat_attempt,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      c.id,
      p.id,
      p.email,
      (NOW() - (random() * INTERVAL '90 days'))::timestamp with time zone,
      CASE WHEN random() < 0.95 THEN true ELSE false END, -- 95% paid
      c.entry_fee,
      CASE 
        WHEN random() < 0.85 THEN 'completed'
        WHEN random() < 0.95 THEN 'pending'
        ELSE 'expired'
      END,
      CASE 
        WHEN random() < 0.003 THEN 'win' -- 0.3% win rate (realistic for hole-in-one)
        WHEN random() < 0.85 THEN 'miss'
        ELSE NULL -- 15% not reported yet
      END,
      true, -- Mark as demo data
      CASE 
        WHEN random() < 0.8 THEN 1 -- 80% first attempt
        WHEN random() < 0.95 THEN 2 -- 15% second attempt
        ELSE floor(random() * 3 + 3)::integer -- 5% third to fifth attempt
      END,
      random() < 0.2, -- 20% are repeat attempts
      NOW() - (random() * INTERVAL '90 days'),
      NOW() - (random() * INTERVAL '30 days')
    FROM competitions c
    CROSS JOIN (
      SELECT * FROM profiles 
      WHERE role IN ('PLAYER', 'CLUB', 'ADMIN')
      AND status = 'active'
      ORDER BY random() 
    ) p
    WHERE c.archived = false
    AND random() < 0.4 -- Vary participation across competitions
    LIMIT needed_entries;

    GET DIAGNOSTICS inserted_entries = ROW_COUNT;
  END IF;

  -- Record demo session
  INSERT INTO demo_data_sessions (
    session_type,
    created_by,
    entities_created,
    notes
  ) VALUES (
    'top_up_existing_users',
    auth.uid(),
    jsonb_build_object(
      'entries_created', inserted_entries,
      'target_count', p_target_count,
      'existing_users_used', existing_user_count
    ),
    'Fixed top-up function: uses existing real user profiles for demo entries'
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_entry_count', current_entry_count,
    'target_entry_count', p_target_count,
    'needed_entries', needed_entries,
    'inserted_entries', inserted_entries,
    'new_entry_total', current_entry_count + inserted_entries,
    'competitions_available', competition_count,
    'existing_users_used', existing_user_count,
    'message', CASE 
      WHEN inserted_entries > 0 THEN 
        'Created ' || inserted_entries || ' demo entries using existing user profiles'
      ELSE 
        'No demo entries needed - target already met'
    END
  );
END;
$function$;

-- Create functions for Super Admin profile management
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

-- Create function for general player deletion
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

-- Create function for admin user deletion with safeguards
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

-- Add production environment protection
CREATE OR REPLACE FUNCTION public.is_production_environment()
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
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