-- Add hole_number field to competitions table
ALTER TABLE public.competitions ADD COLUMN hole_number integer NOT NULL DEFAULT 1;

-- Create a sample club first  
INSERT INTO public.clubs (name, email, phone, address) VALUES 
('Pinehurst Golf Club', 'info@pinehurst.test', '+1-555-0123', '123 Golf Course Rd, Pinehurst, NC');

-- Create sample competitions with proper enum casting
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
  (SELECT id FROM public.clubs WHERE name = 'Pinehurst Golf Club'),
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '7 days', 
  2500,
  50000,
  7,
  'SCHEDULED'::competition_status
),
(
  'Summer Championship Challenge', 
  'The most challenging hole on our course - are you up for it?',
  (SELECT id FROM public.clubs WHERE name = 'Pinehurst Golf Club'),
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '5 days',
  5000,
  100000,
  12,
  'ACTIVE'::competition_status
),
(
  'Autumn Pro Challenge',
  'This competition has ended but showcases our premium events.',
  (SELECT id FROM public.clubs WHERE name = 'Pinehurst Golf Club'), 
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '3 days',
  10000,
  250000,
  18,
  'ENDED'::competition_status
);