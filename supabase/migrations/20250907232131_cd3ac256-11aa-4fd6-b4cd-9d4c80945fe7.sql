-- Create some test entries with expired attempt windows to demonstrate auto-miss functionality
INSERT INTO entries (
  player_id,
  competition_id,
  attempt_window_start,
  attempt_window_end,
  outcome_self,
  entry_date,
  created_at
) 
SELECT 
  (SELECT id FROM profiles WHERE role = 'PLAYER' LIMIT 1),
  (SELECT id FROM competitions LIMIT 1),
  now() - interval '2 hours',
  now() - interval '1 hour', -- Expired 1 hour ago
  NULL, -- No outcome reported
  now() - interval '2 hours',
  now() - interval '2 hours'
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'PLAYER')
  AND EXISTS (SELECT 1 FROM competitions)

UNION ALL

SELECT 
  (SELECT id FROM profiles WHERE role = 'PLAYER' LIMIT 1),
  (SELECT id FROM competitions LIMIT 1),
  now() - interval '1 day',
  now() - interval '23 hours', -- Expired 23 hours ago
  NULL, -- No outcome reported
  now() - interval '1 day',
  now() - interval '1 day'
WHERE EXISTS (SELECT 1 FROM profiles WHERE role = 'PLAYER')
  AND EXISTS (SELECT 1 FROM competitions);

-- Now run the auto-miss function to see it work
SELECT public.update_expired_entries() as entries_updated;