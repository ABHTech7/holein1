-- Create realistic entry data using existing user profiles for the club
DO $$
DECLARE
    existing_players UUID[];
    player_count INTEGER;
    competition_1 UUID := '67aca4b7-e355-47e2-aa2e-f3f4cae942e5'; -- YEAR LONG HOLE IN ONE!
    competition_2 UUID := 'f3116e48-45ef-4049-b7ad-715573e3671f'; -- Active Spring Challenge
    entry_date_base TIMESTAMP WITH TIME ZONE;
    current_player UUID;
    i INTEGER;
    player_idx INTEGER;
BEGIN
    -- Get existing player profiles (excluding the club user)
    SELECT ARRAY(
        SELECT id FROM profiles 
        WHERE role = 'PLAYER' 
        AND id != '8ef0fd32-1045-4d8a-92f0-dea21187145a'
        LIMIT 10
    ) INTO existing_players;
    
    player_count := array_length(existing_players, 1);
    
    -- If we have existing players, create entries
    IF player_count > 0 THEN
        -- Create entries for the last 30 days with realistic golf patterns
        FOR i IN 0..29 LOOP
            entry_date_base := (NOW() - INTERVAL '1 day' * i);
            
            -- Weekend pattern: More entries on Saturday/Sunday
            IF EXTRACT(DOW FROM entry_date_base) IN (0, 6) THEN -- Sunday or Saturday
                -- Create 3-8 entries on weekends
                FOR player_idx IN 1..LEAST(player_count, 5) LOOP
                    -- YEAR LONG HOLE IN ONE! entries
                    IF random() < 0.6 THEN
                        current_player := existing_players[((player_idx - 1) % player_count) + 1];
                        INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                        VALUES (
                            current_player, 
                            competition_1, 
                            entry_date_base + INTERVAL '1 hour' * (9 + random() * 8), 
                            true, 
                            entry_date_base + INTERVAL '1 hour' * (9 + random() * 8) + INTERVAL '5 minutes'
                        );
                    END IF;
                    
                    -- Active Spring Challenge entries
                    IF random() < 0.3 THEN
                        current_player := existing_players[((player_idx + 1) % player_count) + 1];
                        INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                        VALUES (
                            current_player, 
                            competition_2, 
                            entry_date_base + INTERVAL '1 hour' * (10 + random() * 6), 
                            true, 
                            entry_date_base + INTERVAL '1 hour' * (10 + random() * 6) + INTERVAL '10 minutes'
                        );
                    END IF;
                END LOOP;
            ELSE
                -- Weekday pattern: Fewer entries (1-3 entries)
                FOR player_idx IN 1..LEAST(player_count, 3) LOOP
                    -- YEAR LONG HOLE IN ONE! entries
                    IF random() < 0.25 THEN
                        current_player := existing_players[((player_idx - 1) % player_count) + 1];
                        INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                        VALUES (
                            current_player, 
                            competition_1, 
                            entry_date_base + INTERVAL '1 hour' * (11 + random() * 6), 
                            true, 
                            entry_date_base + INTERVAL '1 hour' * (11 + random() * 6) + INTERVAL '5 minutes'
                        );
                    END IF;
                    
                    -- Active Spring Challenge entries
                    IF random() < 0.1 THEN
                        current_player := existing_players[((player_idx + 1) % player_count) + 1];
                        INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
                        VALUES (
                            current_player, 
                            competition_2, 
                            entry_date_base + INTERVAL '1 hour' * (12 + random() * 5), 
                            true, 
                            entry_date_base + INTERVAL '1 hour' * (12 + random() * 5) + INTERVAL '8 minutes'
                        );
                    END IF;
                END LOOP;
            END IF;
        END LOOP;

        -- Add some recent pending entries
        IF player_count >= 2 THEN
            INSERT INTO entries (player_id, competition_id, entry_date, paid) 
            VALUES 
            (existing_players[1], competition_1, NOW() - INTERVAL '2 hours', false),
            (existing_players[2], competition_2, NOW() - INTERVAL '4 hours', false);
            
            IF player_count >= 3 THEN
                INSERT INTO entries (player_id, competition_id, entry_date, paid) 
                VALUES (existing_players[3], competition_1, NOW() - INTERVAL '1 hour', false);
            END IF;
        END IF;
    END IF;

    -- Update competitions to have proper commission amounts (15% of entry fee)
    UPDATE competitions 
    SET commission_amount = CASE 
        WHEN entry_fee = 1000 THEN 150.00  -- £10 entry = £1.50 commission (15%)
        WHEN entry_fee = 2500 THEN 375.00  -- £25 entry = £3.75 commission (15%)  
        WHEN entry_fee = 5000 THEN 750.00  -- £50 entry = £7.50 commission (15%)
        ELSE entry_fee * 0.15
    END
    WHERE club_id = '74f54310-ee8b-4b39-b3c1-76f7994647b0';

END $$;