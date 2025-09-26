-- Fix demo players that were incorrectly marked as non-demo data
UPDATE public.profiles 
SET is_demo_data = true, updated_at = now()
WHERE email LIKE '%@demo.holein1.test'
  AND is_demo_data = false;

-- Create entries for demo players now that they're properly marked
-- This will create entries for competitions that demo players can participate in
DO $$
DECLARE
  demo_player_ids uuid[];
  competition_ids uuid[];
  player_id uuid;
  comp_id uuid;
  entry_count integer := 0;
BEGIN
  -- Get demo player IDs
  SELECT ARRAY(
    SELECT id FROM public.profiles 
    WHERE is_demo_data = true 
    AND role = 'PLAYER' 
    AND status = 'active'
    LIMIT 200  -- Limit to prevent timeout
  ) INTO demo_player_ids;

  -- Get demo competition IDs  
  SELECT ARRAY(
    SELECT id FROM public.competitions
    WHERE is_demo_data = true 
    AND status = 'ACTIVE'
    LIMIT 20
  ) INTO competition_ids;

  -- Create entries for each player-competition combination
  FOREACH player_id IN ARRAY demo_player_ids
  LOOP
    FOREACH comp_id IN ARRAY competition_ids
    LOOP
      -- Only create entry if one doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM public.entries 
        WHERE player_id = player_id AND competition_id = comp_id
      ) THEN
        INSERT INTO public.entries (
          player_id,
          competition_id,
          entry_date,
          paid,
          payment_date,
          price_paid,
          status,
          is_demo_data,
          email
        ) VALUES (
          player_id,
          comp_id,
          now() - (random() * INTERVAL '30 days'),  -- Random date within last 30 days
          true,
          now() - (random() * INTERVAL '30 days'),
          (SELECT entry_fee FROM competitions WHERE id = comp_id),
          CASE WHEN random() < 0.1 THEN 'verification_pending' ELSE 'completed' END,
          true,
          (SELECT email FROM profiles WHERE id = player_id)
        );
        
        entry_count := entry_count + 1;
        
        -- Exit early if we've created enough entries to prevent timeout
        IF entry_count >= 1000 THEN
          EXIT;
        END IF;
      END IF;
      
      -- Exit early if we've created enough entries
      IF entry_count >= 1000 THEN
        EXIT;
      END IF;
    END LOOP;
    
    -- Exit early if we've created enough entries  
    IF entry_count >= 1000 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created % demo entries', entry_count;
END $$;