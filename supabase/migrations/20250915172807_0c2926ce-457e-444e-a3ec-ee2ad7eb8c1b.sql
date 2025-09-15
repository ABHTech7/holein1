-- Add performance index to optimize Club profile access queries
CREATE INDEX IF NOT EXISTS idx_entries_player_competition 
ON entries(player_id, competition_id);