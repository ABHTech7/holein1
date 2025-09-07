-- Drop the existing check constraint and create a new one that allows 'auto_miss'
ALTER TABLE entries DROP CONSTRAINT entries_outcome_self_check;

-- Add the updated constraint that includes 'auto_miss'
ALTER TABLE entries ADD CONSTRAINT entries_outcome_self_check 
CHECK (outcome_self IS NULL OR outcome_self = ANY (ARRAY['win'::text, 'miss'::text, 'auto'::text, 'auto_miss'::text]));

-- Now create a test entry and run the auto-miss function
INSERT INTO entries (
  player_id,
  competition_id,
  attempt_window_start,
  attempt_window_end,
  outcome_self,
  entry_date,
  status,
  created_at
) 
SELECT 
  (SELECT id FROM profiles WHERE role = 'PLAYER' LIMIT 1),
  (SELECT id FROM competitions LIMIT 1),
  now() - interval '2 hours',
  now() - interval '1 hour',
  NULL,
  now() - interval '2 hours',
  'pending',
  now() - interval '2 hours'
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'PLAYER')
  AND EXISTS (SELECT 1 FROM competitions);

-- Run the auto-miss function
SELECT public.update_expired_entries() as entries_updated;