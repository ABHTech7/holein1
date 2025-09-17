-- Fix profiles.status column to be NOT NULL with proper default
ALTER TABLE public.profiles 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'active';

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);