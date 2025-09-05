-- Add hole_number field to competitions table
ALTER TABLE public.competitions ADD COLUMN hole_number integer NOT NULL DEFAULT 1;

-- Create some sample competitions for testing
INSERT INTO public.competitions (
  name,
  description, 
  club_id,
  start_date,
  end_date,
  entry_fee,
  prize_pool,
  hole_number,
  status
) VALUES 
(
  'Spring Hole-in-One Challenge',
  'Test your skills on our signature par-3 with a chance to win big!',
  (SELECT id FROM public.clubs LIMIT 1),
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '7 days', 
  2500, -- $25.00 in cents
  50000, -- $500.00 prize pool in cents
  7,
  'SCHEDULED'
),
(
  'Summer Championship Challenge', 
  'The most challenging hole on our course - are you up for it?',
  (SELECT id FROM public.clubs LIMIT 1),
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '5 days',
  5000, -- $50.00 entry fee
  100000, -- $1000.00 prize pool
  12,
  'ACTIVE'  
),
(
  'Autumn Pro Challenge',
  'This competition has ended but showcases our premium events.',
  (SELECT id FROM public.clubs LIMIT 1), 
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '3 days',
  10000, -- $100.00 entry fee
  250000, -- $2500.00 prize pool
  18,
  'ENDED'
);

-- If no clubs exist, create a sample club first
INSERT INTO public.clubs (name, email, phone, address) 
SELECT 'Pinehurst Golf Club', 'info@pinehurst.test', '+1-555-0123', '123 Golf Course Rd, Pinehurst, NC'
WHERE NOT EXISTS (SELECT 1 FROM public.clubs);