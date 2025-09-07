-- Fix security warning by setting search_path and complete the 12-hour cooldown implementation

-- Recreate the function with proper security settings
CREATE OR REPLACE FUNCTION check_entry_cooldown()
RETURNS trigger AS $$
BEGIN
    -- Check if there's a recent entry within 12 hours for the same player and competition
    IF EXISTS (
        SELECT 1 FROM entries 
        WHERE player_id = NEW.player_id 
        AND competition_id = NEW.competition_id 
        AND entry_date > (NEW.entry_date - INTERVAL '12 hours')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Players must wait 12 hours between entries for the same competition';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger to enforce the 12-hour cooldown
DROP TRIGGER IF EXISTS entry_cooldown_check ON entries;
CREATE TRIGGER entry_cooldown_check
    BEFORE INSERT OR UPDATE ON entries
    FOR EACH ROW
    EXECUTE FUNCTION check_entry_cooldown();

-- Add some sample multiple entries with proper time gaps to demonstrate the feature
DO $$
DECLARE
    sample_player UUID;
    competition_id UUID := '67aca4b7-e355-47e2-aa2e-f3f4cae942e5'; -- YEAR LONG HOLE IN ONE!
BEGIN
    -- Get a sample player
    SELECT id INTO sample_player FROM profiles WHERE role = 'PLAYER' LIMIT 1;
    
    IF sample_player IS NOT NULL THEN
        -- Add entries with proper time gaps (more than 12 hours apart)
        INSERT INTO entries (player_id, competition_id, entry_date, paid, payment_date) 
        VALUES 
        (sample_player, competition_id, NOW() - INTERVAL '25 hours', true, NOW() - INTERVAL '25 hours' + INTERVAL '5 minutes'),
        (sample_player, competition_id, NOW() - INTERVAL '13 hours', true, NOW() - INTERVAL '13 hours' + INTERVAL '3 minutes')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;