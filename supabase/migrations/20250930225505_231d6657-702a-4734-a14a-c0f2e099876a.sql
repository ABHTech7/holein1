-- Create RPC function to create new entry for current user
CREATE OR REPLACE FUNCTION public.create_new_entry_for_current_email(p_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_new_entry_id uuid;
  v_user_id uuid;
  v_user_email text;
  v_recent_entry_count integer;
  v_attempt_window_start timestamptz;
  v_attempt_window_end timestamptz;
  v_auto_miss_at timestamptz;
  v_result jsonb;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  v_user_email := lower(auth.jwt() ->> 'email');
  
  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Duplicate-click guard: check if user created entry for this competition in last 60 seconds
  SELECT COUNT(*) INTO v_recent_entry_count
  FROM entries
  WHERE player_id = v_user_id
    AND competition_id = p_competition_id
    AND created_at > now() - interval '60 seconds';
  
  IF v_recent_entry_count > 0 THEN
    -- Return existing recent entry instead of creating duplicate
    SELECT jsonb_build_object(
      'entry_id', id,
      'attempt_window_start', attempt_window_start,
      'attempt_window_end', attempt_window_end,
      'auto_miss_at', auto_miss_at,
      'duplicate_prevented', true
    )
    INTO v_result
    FROM entries
    WHERE player_id = v_user_id
      AND competition_id = p_competition_id
      AND created_at > now() - interval '60 seconds'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN v_result;
  END IF;

  -- Set timing windows
  v_attempt_window_start := now();
  v_attempt_window_end := now() + interval '6 hours';
  v_auto_miss_at := now() + interval '12 hours';

  -- Insert new entry
  INSERT INTO entries (
    player_id,
    email,
    competition_id,
    paid,
    status,
    attempt_window_start,
    attempt_window_end,
    auto_miss_at,
    entry_date,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_email,
    p_competition_id,
    false,
    'pending',
    v_attempt_window_start,
    v_attempt_window_end,
    v_auto_miss_at,
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_new_entry_id;

  -- Return new entry details
  RETURN jsonb_build_object(
    'entry_id', v_new_entry_id,
    'attempt_window_start', v_attempt_window_start,
    'attempt_window_end', v_attempt_window_end,
    'auto_miss_at', v_auto_miss_at,
    'duplicate_prevented', false
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_new_entry_for_current_email(uuid) TO authenticated;

-- Ensure entries table has proper INSERT RLS policy
DROP POLICY IF EXISTS "Players can create authenticated entries" ON entries;
CREATE POLICY "Players can create authenticated entries"
ON entries
FOR INSERT
TO authenticated
WITH CHECK (
  player_id = auth.uid() 
  AND lower(email) = lower(auth.jwt() ->> 'email')
);