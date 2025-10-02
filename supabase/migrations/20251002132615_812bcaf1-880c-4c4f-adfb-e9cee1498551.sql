-- Fix 17a: Add rejection_reason to verifications table
ALTER TABLE public.verifications 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Fix 18b: Add is_highlighted to competitions table
ALTER TABLE public.competitions 
ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN NOT NULL DEFAULT false;

-- Create index for better performance on highlighted competitions
CREATE INDEX IF NOT EXISTS idx_competitions_highlighted 
ON public.competitions(is_highlighted) 
WHERE is_highlighted = true AND archived = false;