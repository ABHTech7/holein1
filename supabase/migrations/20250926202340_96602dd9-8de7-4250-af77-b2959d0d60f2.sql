-- Enhanced Top-Up Demo Data Function
-- This function creates both demo players and demo entries against real competitions

CREATE OR REPLACE FUNCTION public.top_up_demo_entries(p_target_count integer DEFAULT 1322)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_entry_count integer;
  current_player_count integer;
  needed_entries integer;
  needed_players integer;
  inserted_players integer := 0;
  inserted_entries integer := 0;
  competition_count integer;
  demo_names text[] := ARRAY[
    'James Mitchell', 'Sarah Thompson', 'David Wilson', 'Emma Johnson', 'Michael Brown',
    'Lisa Davis', 'Robert Taylor', 'Jennifer Wilson', 'William Anderson', 'Michelle White',
    'Christopher Lee', 'Amanda Clark', 'Daniel Martinez', 'Jessica Garcia', 'Matthew Rodriguez',
    'Ashley Miller', 'Andrew Jackson', 'Stephanie Moore', 'Joshua Martin', 'Melissa Lopez',
    'Kevin Hill', 'Laura Green', 'Brian Adams', 'Rachel Baker', 'Steven Turner',
    'Nicole Phillips', 'Mark Campbell', 'Kimberly Parker', 'Paul Evans', 'Donna Edwards',
    'Kenneth Collins', 'Sharon Stewart', 'Joseph Sanchez', 'Carol Morris', 'Charles Rogers',
    'Ruth Reed', 'Thomas Cook', 'Helen Bailey', 'Christopher Rivera', 'Deborah Cooper',
    'Anthony Richardson', 'Maria Cox', 'Donald Ward', 'Lisa Torres', 'Gary Peterson',
    'Nancy Gray', 'Edward Ramirez', 'Sandra James', 'Jason Watson', 'Betty Brooks',
    'Frank Kelly', 'Dorothy Sanders', 'Gregory Price', 'Carolyn Bennett', 'Raymond Wood'
  ];
  demo_domains text[] := ARRAY['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'demo.test'];
BEGIN
  -- Check admin access
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Get current counts
  SELECT COUNT(*) INTO current_entry_count FROM entries WHERE is_demo_data = true;
  SELECT COUNT(*) INTO current_player_count FROM profiles WHERE role = 'PLAYER' AND is_demo_data = true;
  SELECT COUNT(*) INTO competition_count FROM competitions WHERE archived = false;

  -- Calculate needed entries
  needed_entries := GREATEST(0, p_target_count - current_entry_count);
  
  -- Ensure we have enough demo players (at least 100, or 1 per 10 entries needed)
  needed_players := GREATEST(0, GREATEST(100, needed_entries / 10) - current_player_count);

  -- Create demo players if needed
  IF needed_players > 0 THEN
    INSERT INTO profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      age_years,
      handicap,
      phone,
      phone_e164,
      gender,
      is_demo_data,
      status,
      created_at
    )
    SELECT
      gen_random_uuid(),
      LOWER(REPLACE(split_part(demo_names[i], ' ', 1), ' ', '')) || '.' || 
      LOWER(REPLACE(split_part(demo_names[i], ' ', 2), ' ', '')) || 
      floor(random() * 999 + 1)::text || '@' || demo_domains[((i-1) % array_length(demo_domains, 1)) + 1],
      split_part(demo_names[i], ' ', 1),
      split_part(demo_names[i], ' ', 2),
      'PLAYER',
      floor(random() * 50 + 18)::integer, -- Age 18-68
      CASE 
        WHEN random() < 0.3 THEN NULL -- 30% no handicap
        ELSE round((random() * 36)::numeric, 1) -- 0-36 handicap
      END,
      CASE 
        WHEN random() < 0.7 THEN '+44' || floor(random() * 900000000 + 100000000)::text
        ELSE NULL
      END,
      CASE 
        WHEN random() < 0.7 THEN '+44' || floor(random() * 900000000 + 100000000)::text
        ELSE NULL
      END,
      CASE 
        WHEN random() < 0.6 THEN 'male'
        WHEN random() < 0.9 THEN 'female'
        ELSE 'other'
      END,
      true,
      'active',
      NOW() - (random() * INTERVAL '180 days')
    FROM generate_series(1, LEAST(needed_players, array_length(demo_names, 1))) AS i;

    GET DIAGNOSTICS inserted_players = ROW_COUNT;
  END IF;

  -- Create demo entries if needed
  IF needed_entries > 0 AND competition_count > 0 THEN
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
      true,
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
      WHERE role = 'PLAYER' 
      AND is_demo_data = true
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
    'top_up',
    auth.uid(),
    jsonb_build_object(
      'players_created', inserted_players,
      'entries_created', inserted_entries,
      'target_count', p_target_count
    ),
    'Enhanced top-up function: auto-created players and entries'
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_entry_count', current_entry_count,
    'previous_player_count', current_player_count,
    'target_entry_count', p_target_count,
    'needed_entries', needed_entries,
    'needed_players', needed_players,
    'inserted_players', inserted_players,
    'inserted_entries', inserted_entries,
    'new_entry_total', current_entry_count + inserted_entries,
    'new_player_total', current_player_count + inserted_players,
    'competitions_available', competition_count,
    'message', CASE 
      WHEN inserted_players > 0 AND inserted_entries > 0 THEN 
        'Created ' || inserted_players || ' demo players and ' || inserted_entries || ' demo entries'
      WHEN inserted_entries > 0 THEN 
        'Created ' || inserted_entries || ' demo entries using existing players'
      WHEN inserted_players > 0 THEN 
        'Created ' || inserted_players || ' demo players (no entries needed)'
      ELSE 
        'No demo data needed - targets already met'
    END
  );
END;
$function$;