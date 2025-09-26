-- Fix demo data email generation
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
    'Royal Lytham Golf Club', 'Carnoustie Golf Links', 'Royal Birkdale',
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
  safe_club_name text;
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
      -- Safely sanitize club name for email domain
      safe_club_name := LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(club_names[((i - 1) % array_length(club_names, 1)) + 1], '[^a-zA-Z0-9 ]', '', 'g'),
        '\s+', '', 'g'
      ));
      
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
        'contact' || i || '@' || safe_club_name || '.demo',
        '+44' || (1000000000 + floor(random() * 900000000)::bigint)::text,
        (i * 10) || ' Golf Course Road, Demo City, DC' || (10000 + i),
        'https://www.' || safe_club_name || '.demo',
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
        'player' || i || '@demogolf.test',
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

  -- Create demo competitions for the new clubs
  INSERT INTO competitions (
    id,
    club_id,
    name,
    description,
    start_date,
    end_date,
    status,
    entry_fee,
    hole_number,
    is_demo_data,
    created_at
  )
  SELECT
    gen_random_uuid(),
    c.id,
    'Hole in One Challenge ' || (ROW_NUMBER() OVER (ORDER BY c.created_at)),
    'Demo competition for ' || c.name,
    NOW() - (random() * INTERVAL '30 days'),
    NOW() + (random() * INTERVAL '90 days'),
    'ACTIVE',
    CASE 
      WHEN random() < 0.3 THEN 5.00
      WHEN random() < 0.6 THEN 10.00
      WHEN random() < 0.8 THEN 15.00
      ELSE 20.00 + (random() * 30)
    END,
    CASE 
      WHEN random() < 0.5 THEN 1  -- Par 3s mostly
      WHEN random() < 0.8 THEN 3
      ELSE 7  -- Challenging holes
    END,
    true,
    NOW() - (random() * INTERVAL '60 days')
  FROM clubs c
  WHERE c.is_demo_data = true;

  -- Get all existing competitions (including newly created ones)
  SELECT array_agg(id) INTO existing_competitions FROM competitions WHERE archived = false;

  -- Create demo entries if we have competitions
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
    'Enhanced top-up: Fixed email generation for club domains'
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