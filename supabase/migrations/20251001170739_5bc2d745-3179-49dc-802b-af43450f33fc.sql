-- Fix Issue #2: Ensure competition_id is returned by get_my_entries RPC
-- The RPC already selects competition_id, but let's verify it's properly typed and returned

-- No schema changes needed, the competition_id column already exists in entries table
-- and is already being selected in get_my_entries function

-- Just add a comment to document this
COMMENT ON FUNCTION public.get_my_entries IS 'Returns player entries with competition_id, competition_name, club_name, etc. Used by player dashboard and play-again functionality.';