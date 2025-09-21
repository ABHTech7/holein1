-- Fix competition status to allow ACTIVE status for entries
-- Update the competition that's currently SCHEDULED to be ACTIVE
UPDATE public.competitions 
SET status = 'ACTIVE' 
WHERE status = 'SCHEDULED' 
  AND start_date <= now()
  AND (end_date IS NULL OR end_date > now() OR is_year_round = true);

-- Also update any competitions that should be active based on their dates
UPDATE public.competitions 
SET status = public.get_competition_status(start_date, end_date, is_year_round)
WHERE status != public.get_competition_status(start_date, end_date, is_year_round);