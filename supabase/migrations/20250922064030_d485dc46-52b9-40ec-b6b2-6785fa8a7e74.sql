-- Update supabase config for new function
ALTER TABLE public.verifications
ADD COLUMN IF NOT EXISTS social_consent BOOLEAN DEFAULT FALSE;