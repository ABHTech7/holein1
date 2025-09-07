-- Create a test entry with expired attempt window to test auto-miss functionality
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
  now() - interval '1 hour', -- Expired 1 hour ago
  NULL, -- No outcome reported
  now() - interval '2 hours',
  'pending', -- Explicitly set as pending
  now() - interval '2 hours'
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'PLAYER')
  AND EXISTS (SELECT 1 FROM competitions);

-- Now run the auto-miss function
SELECT public.update_expired_entries() as entries_updated;