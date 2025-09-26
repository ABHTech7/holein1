-- Add new columns to entries table for repeat tracking and analytics
ALTER TABLE public.entries 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_repeat_attempt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_paid NUMERIC(8,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS utm JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS device JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ip_hash TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create indexes for performance (case-insensitive email)
CREATE INDEX IF NOT EXISTS idx_entries_email_competition_date 
ON public.entries (lower(email), competition_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_email_date 
ON public.entries (lower(email), created_at DESC);

-- Update RLS policies for email-based access (case-insensitive)
DROP POLICY IF EXISTS "player_select_own_entries_email" ON public.entries;
CREATE POLICY "player_select_own_entries_email" 
ON public.entries FOR SELECT 
USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- Create function to calculate attempt number and update repeat status
CREATE OR REPLACE FUNCTION public.calculate_attempt_number(
  p_email TEXT,
  p_competition_id UUID
) RETURNS INTEGER
LANGUAGE SQL 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  FROM public.entries
  WHERE lower(email) = lower(p_email)
    AND competition_id = p_competition_id;
$$;

-- Create trigger function to auto-calculate attempt numbers
CREATE OR REPLACE FUNCTION public.set_attempt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Calculate attempt number
  NEW.attempt_number := public.calculate_attempt_number(NEW.email, NEW.competition_id);
  
  -- Set repeat attempt flag
  NEW.is_repeat_attempt := (NEW.attempt_number > 1);
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-set attempt numbers on insert
DROP TRIGGER IF EXISTS trigger_set_attempt_number ON public.entries;
CREATE TRIGGER trigger_set_attempt_number
  BEFORE INSERT ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_attempt_number();