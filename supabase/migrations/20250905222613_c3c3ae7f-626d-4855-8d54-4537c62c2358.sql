-- Update competitions table to support fixed commission amounts instead of percentages
-- and make end_date optional for year-round competitions

-- First, let's rename the commission_rate column to commission_amount and change its purpose
ALTER TABLE public.competitions 
RENAME COLUMN commission_rate TO commission_amount;

-- Update the column comment to clarify it's now a fixed amount in pence
COMMENT ON COLUMN public.competitions.commission_amount IS 'Fixed commission amount in pence (GBP)';

-- Make end_date nullable to support year-round competitions
ALTER TABLE public.competitions 
ALTER COLUMN end_date DROP NOT NULL;

-- Add a boolean flag to indicate if competition runs year-round
ALTER TABLE public.competitions 
ADD COLUMN is_year_round BOOLEAN NOT NULL DEFAULT false;

-- Update any existing competitions to have reasonable defaults
-- Set commission_amount to 0 pence if it was a percentage
UPDATE public.competitions 
SET commission_amount = 0 
WHERE commission_amount IS NOT NULL AND commission_amount <= 100;

-- Update the status logic to handle year-round competitions
-- Create a function to determine competition status
CREATE OR REPLACE FUNCTION public.get_competition_status(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_year_round BOOLEAN
) RETURNS competition_status AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;