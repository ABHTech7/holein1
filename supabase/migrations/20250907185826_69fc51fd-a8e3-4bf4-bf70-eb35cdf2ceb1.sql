-- Create dummy entries for existing competitions to generate realistic dashboard data
-- First, let's create some demo players if they don't exist
DO $$
DECLARE
    demo_player_1 UUID;
    demo_player_2 UUID;
    demo_player_3 UUID;
    demo_player_4 UUID;
    demo_player_5 UUID;
    competition_1 UUID := '67aca4b7-e355-47e2-aa2e-f3f4cae942e5'; -- YEAR LONG HOLE IN ONE!
    competition_2 UUID := 'f3116e48-45ef-4049-b7ad-715573e3671f'; -- Active Spring Challenge
    competition_3 UUID := '8492b4c0-80bb-4f04-832d-11a204064d29'; -- Upcoming Summer Championship
    entry_date_base TIMESTAMP WITH TIME ZONE;
    i INTEGER;
BEGIN
    -- Create demo players with proper auth entries first
    INSERT INTO auth.users (
        id, 
        instance_id, 
        aud, 
        role, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        invited_at, 
        confirmation_token, 
        confirmation_sent_at, 
        recovery_token, 
        recovery_sent_at, 
        email_change_token_new, 
        email_change, 
        email_change_sent_at, 
        last_sign_in_at, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        is_super_admin, 
        created_at, 
        updated_at, 
        phone, 
        phone_confirmed_at, 
        phone_change, 
        phone_change_token, 
        phone_change_sent_at, 
        email_change_confirmation_status, 
        banned_until, 
        delete_at
    ) VALUES 
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'player1.demo@holein1.test', crypt('demopassword123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"first_name":"James","last_name":"Wilson","role":"PLAYER"}', false, NOW(), NOW(), NULL, NULL, '', '', NULL, 0, NULL, NULL),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'player2.demo@holein1.test', crypt('demopassword123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"first_name":"Sarah","last_name":"Johnson","role":"PLAYER"}', false, NOW(), NOW(), NULL, NULL, '', '', NULL, 0, NULL, NULL),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'player3.demo@holein1.test', crypt('demopassword123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"first_name":"Michael","last_name":"Brown","role":"PLAYER"}', false, NOW(), NOW(), NULL, NULL, '', '', NULL, 0, NULL, NULL),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'player4.demo@holein1.test', crypt('demopassword123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"first_name":"Emma","last_name":"Davis","role":"PLAYER"}', false, NOW(), NOW(), NULL, NULL, '', '', NULL, 0, NULL, NULL),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'player5.demo@holein1.test', crypt('demopassword123', gen_salt('bf')), NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"first_name":"Robert","last_name":"Taylor","role":"PLAYER"}', false, NOW(), NOW(), NULL, NULL, '', '', NULL, 0, NULL, NULL)
    ON CONFLICT (email) DO NOTHING;

    -- Get the player IDs
    SELECT id INTO demo_player_1 FROM auth.users WHERE email = 'player1.demo@holein1.test';
    SELECT id INTO demo_player_2 FROM auth.users WHERE email = 'player2.demo@holein1.test';
    SELECT id INTO demo_player_3 FROM auth.users WHERE email = 'player3.demo@holein1.test';
    SELECT id INTO demo_player_4 FROM auth.users WHERE email = 'player4.demo@holein1.test';
    SELECT id INTO demo_player_5 FROM auth.users WHERE email = 'player5.demo@holein1.test';

    -- Create entries for the last 30 days with realistic golf patterns (more on weekends)
    FOR i IN 0..29 LOOP
        entry_date_base := (NOW() - INTERVAL '1 day' * i);
        
        -- Weekend pattern: More entries on Saturday/Sunday
        IF EXTRACT(DOW FROM entry_date_base) IN (0, 6) THEN -- Sunday or Saturday
            -- 8-15 entries on weekends
            -- YEAR LONG HOLE IN ONE! (£10 entry, £1.50 commission)
            IF random() < 0.8 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_1, competition_1, entry_date_base + INTERVAL '10 hours', true, entry_date_base + INTERVAL '10 hours 5 minutes');
            END IF;
            IF random() < 0.7 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_2, competition_1, entry_date_base + INTERVAL '11 hours', true, entry_date_base + INTERVAL '11 hours 3 minutes');
            END IF;
            IF random() < 0.6 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_3, competition_1, entry_date_base + INTERVAL '14 hours', true, entry_date_base + INTERVAL '14 hours 7 minutes');
            END IF;
            
            -- Active Spring Challenge (£25 entry, £3.75 commission)
            IF random() < 0.5 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_4, competition_2, entry_date_base + INTERVAL '9 hours', true, entry_date_base + INTERVAL '9 hours 15 minutes');
            END IF;
            IF random() < 0.4 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_5, competition_2, entry_date_base + INTERVAL '15 hours', true, entry_date_base + INTERVAL '15 hours 8 minutes');
            END IF;
            IF random() < 0.3 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_1, competition_2, entry_date_base + INTERVAL '16 hours', true, entry_date_base + INTERVAL '16 hours 12 minutes');
            END IF;
        ELSE
            -- Weekday pattern: Fewer entries (2-6 entries)
            -- YEAR LONG HOLE IN ONE!
            IF random() < 0.3 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_2, competition_1, entry_date_base + INTERVAL '12 hours', true, entry_date_base + INTERVAL '12 hours 5 minutes');
            END IF;
            IF random() < 0.2 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_4, competition_1, entry_date_base + INTERVAL '17 hours', true, entry_date_base + INTERVAL '17 hours 3 minutes');
            END IF;
            
            -- Active Spring Challenge
            IF random() < 0.15 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                VALUES (demo_player_3, competition_2, entry_date_base + INTERVAL '13 hours', true, entry_date_base + INTERVAL '13 hours 10 minutes');
            END IF;
        END IF;
    END LOOP;

    -- Add some pending payment entries (10% of entries should be unpaid)
    INSERT INTO entries (player_id, competition_id, entry_date, paid) 
    VALUES 
    (demo_player_1, competition_1, NOW() - INTERVAL '2 hours', false),
    (demo_player_3, competition_2, NOW() - INTERVAL '4 hours', false),
    (demo_player_5, competition_1, NOW() - INTERVAL '1 hour', false);

    -- Update competitions to have proper commission amounts
    UPDATE competitions 
    SET commission_amount = CASE 
        WHEN entry_fee = 1000 THEN 150.00  -- £10 entry = £1.50 commission (15%)
        WHEN entry_fee = 2500 THEN 375.00  -- £25 entry = £3.75 commission (15%)  
        WHEN entry_fee = 5000 THEN 750.00  -- £50 entry = £7.50 commission (15%)
        ELSE entry_fee * 0.15
    END
    WHERE club_id = '74f54310-ee8b-4b39-b3c1-76f7994647b0';

END $$;