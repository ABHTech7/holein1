-- First, let's check if the get_competition_status function already exists by trying to recreate it
-- This function calculates the real-time status of competitions based on dates and year-round flag
CREATE OR REPLACE FUNCTION public.get_competition_status(start_date timestamp with time zone, end_date timestamp with time zone, is_year_round boolean)
RETURNS competition_status
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF is_year_round THEN
    -- Year-round competitions are ACTIVE if start date has passed
    IF start_date <= NOW() THEN
      RETURN 'ACTIVE'::competition_status;
    ELSE
      RETURN 'SCHEDULED'::competition_status;
    END IF;
  ELSE
    -- Regular competitions with end dates
    IF end_date IS NULL THEN
      -- If no end date but not marked as year-round, treat as ended
      RETURN 'ENDED'::competition_status;
    ELSIF NOW() < start_date THEN
      RETURN 'SCHEDULED'::competition_status;
    ELSIF NOW() >= start_date AND NOW() <= end_date THEN
      RETURN 'ACTIVE'::competition_status;
    ELSE
      RETURN 'ENDED'::competition_status;
    END IF;
  END IF;
END;
$$;