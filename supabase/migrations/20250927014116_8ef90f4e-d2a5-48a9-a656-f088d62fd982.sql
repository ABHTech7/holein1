-- Simple fix: Just activate the club for now
UPDATE public.clubs 
SET 
  active = true,
  updated_at = now()
WHERE name = 'Bramhall Golf Club';