-- Remove the unique constraint that prevents multiple entries per player per competition
-- and add a constraint to enforce 12-hour cooldown period

-- First, drop the existing unique constraint
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_competition_id_player_id_key;

-- Create a function to check if enough time has passed since last entry
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
$$ LANGUAGE plpgsql;