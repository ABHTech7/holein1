-- Phase 1: Database Schema Updates (Fixed) for Refined Player Journey

-- Add missing fields to profiles table
DO $$ 
BEGIN
    -- Add age_years column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='age_years') THEN
        ALTER TABLE public.profiles ADD COLUMN age_years INTEGER CHECK (age_years >= 16 AND age_years <= 100);
        COMMENT ON COLUMN public.profiles.age_years IS 'Player age in years, must be 16-100 for amateur eligibility';
    END IF;
    
    -- Add phone_e164 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_e164') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_e164 TEXT;
        COMMENT ON COLUMN public.profiles.phone_e164 IS 'Phone number in E.164 international format';
    END IF;
END $$;

-- Update entries table to support the new flow
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entries' AND column_name='status') THEN
        ALTER TABLE public.entries ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add terms columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entries' AND column_name='terms_version') THEN
        ALTER TABLE public.entries ADD COLUMN terms_version TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entries' AND column_name='terms_accepted_at') THEN
        ALTER TABLE public.entries ADD COLUMN terms_accepted_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add additional outcome tracking fields to entries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entries' AND column_name='outcome_self') THEN
        ALTER TABLE public.entries ADD COLUMN outcome_self TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entries' AND column_name='outcome_official') THEN
        ALTER TABLE public.entries ADD COLUMN outcome_official TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entries' AND column_name='outcome_reported_at') THEN
        ALTER TABLE public.entries ADD COLUMN outcome_reported_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entries' AND column_name='attempt_window_start') THEN
        ALTER TABLE public.entries ADD COLUMN attempt_window_start TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entries' AND column_name='attempt_window_end') THEN
        ALTER TABLE public.entries ADD COLUMN attempt_window_end TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_entries_status ON public.entries(status);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_e164);