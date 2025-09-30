-- Add 12-hour global cooldown with same-competition exception
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
  v_competition_entry_fee numeric;
  v_result jsonb;
  v_latest_entry_time timestamptz;
  v_latest_entry_comp_id uuid;
  v_latest_entry_outcome text;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  v_user_email := lower(auth.jwt() ->> 'email');
  
  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get competition entry fee
  SELECT entry_fee INTO v_competition_entry_fee
  FROM competitions
  WHERE id = p_competition_id;
  
  IF v_competition_entry_fee IS NULL THEN
    RAISE EXCEPTION 'Competition not found or has no entry fee';
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

  -- 12-HOUR GLOBAL COOLDOWN CHECK
  -- Find the most recent entry in the last 12 hours (any competition)
  SELECT 
    created_at,
    competition_id,
    outcome_self
  INTO 
    v_latest_entry_time,
    v_latest_entry_comp_id,
    v_latest_entry_outcome
  FROM entries
  WHERE player_id = v_user_id
    AND created_at > now() - interval '12 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If there's a recent entry within 12 hours
  IF v_latest_entry_time IS NOT NULL THEN
    -- Exception: Allow immediate retry for same competition if it was a miss
    IF v_latest_entry_comp_id = p_competition_id 
       AND v_latest_entry_outcome IN ('miss', 'auto_miss') THEN
      -- Allow: same competition after miss - bypass cooldown
      RAISE NOTICE 'Allowing same-competition retry after miss';
    ELSE
      -- Block: either different competition OR same competition but not after miss
      RETURN jsonb_build_object(
        'success', false,
        'code', 'cooldown_active',
        'message', 'You have already played in the last 12 hours. Please try again later.',
        'cooldown_ends_at', v_latest_entry_time + interval '12 hours'
      );
    END IF;
  END IF;

  -- Set timing windows
  v_attempt_window_start := now();
  v_attempt_window_end := now() + interval '6 hours';
  v_auto_miss_at := now() + interval '12 hours';

  -- Insert new entry with price_paid set to competition entry_fee
  INSERT INTO entries (
    player_id,
    email,
    competition_id,
    paid,
    status,
    price_paid,
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
    v_competition_entry_fee,
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
    'success', true,
    'entry_id', v_new_entry_id,
    'attempt_window_start', v_attempt_window_start,
    'attempt_window_end', v_attempt_window_end,
    'auto_miss_at', v_auto_miss_at,
    'duplicate_prevented', false
  );
END;
$$;