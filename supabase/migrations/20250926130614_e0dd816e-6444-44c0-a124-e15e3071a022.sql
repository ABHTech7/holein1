-- Restore demo entries that were accidentally deleted
INSERT INTO entries (
  id,
  competition_id,
  player_id, 
  email,
  entry_date,
  paid,
  price_paid,
  status,
  outcome_self,
  is_demo_data,
  attempt_number,
  is_repeat_attempt
)
SELECT DISTINCT
  gen_random_uuid(),
  c.id,
  p.id,
  p.email,
  (NOW() - (random() * INTERVAL '30 days'))::timestamp with time zone,
  true,
  c.entry_fee,
  CASE 
    WHEN random() < 0.1 THEN 'completed'
    WHEN random() < 0.8 THEN 'completed' 
    ELSE 'pending'
  END,
  CASE 
    WHEN random() < 0.1 THEN 'win'
    WHEN random() < 0.8 THEN 'miss'
    ELSE NULL
  END,
  true,
  1,
  false
FROM competitions c
CROSS JOIN (
  SELECT * FROM profiles 
  WHERE role = 'PLAYER'
  ORDER BY random() 
  LIMIT 100
) p
WHERE c.archived = false
AND random() < 0.4
LIMIT 800;