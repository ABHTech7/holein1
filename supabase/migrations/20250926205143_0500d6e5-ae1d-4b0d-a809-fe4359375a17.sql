-- Enhanced top_up_demo_entries function to create massive demo data
DROP FUNCTION IF EXISTS public.top_up_demo_entries(integer);

CREATE OR REPLACE FUNCTION public.top_up_demo_entries(
  p_target_clubs integer DEFAULT 20,
  p_target_players integer DEFAULT 500, 
  p_target_entries integer DEFAULT 1200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_demo_clubs integer;
  current_demo_players integer;
  current_demo_entries integer;
  needed_clubs integer;
  needed_players integer;
  needed_entries integer;
  inserted_clubs integer := 0;
  inserted_players integer := 0;
  inserted_entries integer := 0;
  i integer;
  club_names text[] := ARRAY[
    'Augusta National Golf Club', 'St Andrews Links', 'Pebble Beach Golf Links',
    'Pinehurst Resort', 'Royal Troon Golf Club', 'Celtic Manor Resort',
    'The Belfry Golf Club', 'Wentworth Club', 'Gleneagles Hotel',
    'Royal Lytham & St Annes', 'Carnoustie Golf Links', 'Royal Birkdale',
    'Muirfield Golf Club', 'Royal St Georges', 'The Old Course',
    'Turnberry Golf Club', 'Royal Portrush', 'Sunningdale Golf Club',
    'Royal Liverpool', 'The London Golf Club'
  ];
  first_names text[] := ARRAY[
    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
    'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
    'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
    'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
    'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra',
    'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly',
    'Deborah', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen'
  ];
  last_names text[] := ARRAY[
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
    'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera',
    'Campbell', 'Mitchell', 'Carter', 'Roberts'
  ];
  new_club_id uuid;
  new_profile_id uuid;
  existing_competitions uuid[];
BEGIN
  -- Check admin access
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Get current counts
  SELECT COUNT(*) INTO current_demo_clubs FROM clubs WHERE is_demo_data = true;
  SELECT COUNT(*) INTO current_demo_players FROM profiles WHERE is_demo_data = true AND role = 'PLAYER';
  SELECT COUNT(*) INTO current_demo_entries FROM entries WHERE is_demo_data = true;

  -- Calculate needed items
  needed_clubs := GREATEST(0, p_target_clubs - current_demo_clubs);
  needed_players := GREATEST(0, p_target_players - current_demo_players);
  needed_entries := GREATEST(0, p_target_entries - current_demo_entries);

  -- Create demo clubs
  IF needed_clubs > 0 THEN
    FOR i IN 1..needed_clubs LOOP
      INSERT INTO clubs (
        id,
        name,
        email,
        phone,
        address,
        website,
        active,
        is_demo_data,
        created_at
      ) VALUES (
        gen_random_uuid(),
        club_names[((i - 1) % array_length(club_names, 1)) + 1] || ' ' || i,
        'contact+' || i || '@' || lower(replace(club_names[((i - 1) % array_length(club_names, 1)) + 1], ' ', '')) || '.demo',
        '+44' || (1000000000 + floor(random() * 900000000)::bigint)::text,
        (i * 10) || ' Golf Course Road, Demo City, DC' || (10000 + i),
        'https://www.' || lower(replace(club_names[((i - 1) % array_length(club_names, 1)) + 1], ' ', '')) || '.demo',
        true,
        true,
        NOW() - (random() * INTERVAL '180 days')
      );
      inserted_clubs := inserted_clubs + 1;
    END LOOP;
  END IF;

  -- Create demo player profiles
  IF needed_players > 0 THEN
    FOR i IN 1..needed_players LOOP
      new_profile_id := gen_random_uuid();
      INSERT INTO profiles (
        id,
        email,
        first_name,
        last_name,
        phone,
        phone_e164,
        age_years,
        handicap,
        gender,
        role,
        status,
        is_demo_data,
        created_at
      ) VALUES (
        new_profile_id,
        'player+' || i || '@demogolf.test',
        first_names[((i - 1) % array_length(first_names, 1)) + 1],
        last_names[((i - 1) % array_length(last_names, 1)) + 1],
        '+44' || (7000000000 + floor(random() * 999999999)::bigint)::text,
        '+44' || (7000000000 + floor(random() * 999999999)::bigint)::text,
        18 + floor(random() * 62)::integer, -- Age 18-80
        CASE 
          WHEN random() < 0.1 THEN NULL -- 10% no handicap
          WHEN random() < 0.3 THEN random() * 5 -- 20% low handicap (0-5)
          WHEN random() < 0.7 THEN 5 + (random() * 15) -- 40% mid handicap (5-20)
          ELSE 20 + (random() * 16) -- 30% high handicap (20-36)
        END,
        CASE 
          WHEN random() < 0.7 THEN 'male'
          WHEN random() < 0.95 THEN 'female'
          ELSE 'other'
        END,
        'PLAYER',
        'active',
        true,
        NOW() - (random() * INTERVAL '365 days')
      );
      inserted_players := inserted_players + 1;
    END LOOP;
  END IF;

  -- Get all existing competitions
  SELECT array_agg(id) INTO existing_competitions FROM competitions WHERE archived = false;

  -- Create demo entries
  IF needed_entries > 0 AND array_length(existing_competitions, 1) > 0 THEN
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
      existing_competitions[1 + (random() * (array_length(existing_competitions, 1) - 1))::integer],
      p.id,
      p.email,
      (NOW() - (random() * INTERVAL '180 days'))::timestamp with time zone,
      CASE WHEN random() < 0.97 THEN true ELSE false END, -- 97% paid
      CASE 
        WHEN random() < 0.3 THEN 5.00
        WHEN random() < 0.6 THEN 10.00
        WHEN random() < 0.8 THEN 15.00
        WHEN random() < 0.95 THEN 20.00
        ELSE 25.00 + (random() * 25)
      END,
      CASE 
        WHEN random() < 0.88 THEN 'completed'
        WHEN random() < 0.96 THEN 'pending'
        ELSE 'expired'
      END,
      CASE 
        WHEN random() < 0.003 THEN 'win' -- 0.3% win rate (realistic for hole-in-one)
        WHEN random() < 0.85 THEN 'miss'
        ELSE NULL -- 15% not reported yet
      END,
      true, -- Mark as demo data
      CASE 
        WHEN random() < 0.75 THEN 1 -- 75% first attempt
        WHEN random() < 0.92 THEN 2 -- 17% second attempt  
        WHEN random() < 0.98 THEN 3 -- 6% third attempt
        ELSE 4 + floor(random() * 3)::integer -- 2% fourth to sixth attempt
      END,
      random() < 0.25, -- 25% are repeat attempts
      NOW() - (random() * INTERVAL '180 days'),
      NOW() - (random() * INTERVAL '90 days')
    FROM (
      SELECT * FROM profiles 
      WHERE is_demo_data = true 
      AND role = 'PLAYER'
      ORDER BY random()
    ) p
    WHERE random() < 0.6 -- Vary participation rate
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
    'enhanced_top_up',
    auth.uid(),
    jsonb_build_object(
      'clubs_created', inserted_clubs,
      'players_created', inserted_players,
      'entries_created', inserted_entries,
      'target_clubs', p_target_clubs,
      'target_players', p_target_players,
      'target_entries', p_target_entries
    ),
    'Enhanced top-up: Created comprehensive demo data including clubs, players, and entries'
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_clubs', current_demo_clubs,
    'previous_players', current_demo_players,
    'previous_entries', current_demo_entries,
    'target_clubs', p_target_clubs,
    'target_players', p_target_players,
    'target_entries', p_target_entries,
    'inserted_clubs', inserted_clubs,
    'inserted_players', inserted_players,
    'inserted_entries', inserted_entries,
    'new_clubs_total', current_demo_clubs + inserted_clubs,
    'new_players_total', current_demo_players + inserted_players,
    'new_entries_total', current_demo_entries + inserted_entries,
    'message', 'Enhanced demo data created: ' || inserted_clubs || ' clubs, ' || inserted_players || ' players, ' || inserted_entries || ' entries'
  );
END;
$$;

-- Create production data flush function  
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