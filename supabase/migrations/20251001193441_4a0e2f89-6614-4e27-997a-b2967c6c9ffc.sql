-- Remove 12-hour global cooldown; keep 60-second duplicate guard
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
  v_recent_entry_id uuid;
  v_recent_entry_created timestamptz;
  v_attempt_window_start timestamptz;
  v_attempt_window_end timestamptz;
  v_auto_miss_at timestamptz;
  v_competition_entry_fee numeric;
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

  -- 60-SECOND DUPLICATE GUARD: Block accidental double-clicks
  SELECT id, created_at INTO v_recent_entry_id, v_recent_entry_created
  FROM entries
  WHERE player_id = v_user_id
    AND competition_id = p_competition_id
    AND created_at > now() - interval '60 seconds'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_recent_entry_id IS NOT NULL THEN
    -- Return error for duplicate within 60 seconds
    RETURN jsonb_build_object(
      'success', false,
      'code', 'duplicate_recent',
      'message', 'Please wait a moment and try again.',
      'entry_id', v_recent_entry_id,
      'created_at', v_recent_entry_created
    );
  END IF;

  -- Set timing windows: 6h attempt window, 12h auto-miss
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

  -- Return success with new entry details
  RETURN jsonb_build_object(
    'success', true,
    'entry_id', v_new_entry_id,
    'attempt_window_start', v_attempt_window_start,
    'attempt_window_end', v_attempt_window_end,
    'auto_miss_at', v_auto_miss_at
  );
END;
$$;

-- Add performance index if not exists
CREATE INDEX IF NOT EXISTS idx_entries_player_comp_created 
ON entries(player_id, competition_id, created_at DESC);