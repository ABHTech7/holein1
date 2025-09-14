-- Migration 001: Database Foundation & Schema Enhancements (Corrected)
-- Create app_admin role with appropriate permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin;
  END IF;
END
$$;

-- Grant necessary permissions to app_admin
GRANT USAGE ON SCHEMA public TO app_admin;
GRANT CREATE ON SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO app_admin;

-- Additive changes to existing tables
-- Add gender to profiles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='profiles' AND column_name='gender') THEN
    ALTER TABLE public.profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;
END
$$;

-- Add payment_provider to entries table  
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='entries' AND column_name='payment_provider') THEN
    ALTER TABLE public.entries ADD COLUMN payment_provider TEXT CHECK (payment_provider IN ('stripe', 'fondy', 'wise'));
  END IF;
END
$$;

-- Make entry_id NOT NULL in verifications table (if it's nullable)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name='verifications' AND column_name='entry_id' AND is_nullable='YES') THEN
    -- First update any NULL values
    UPDATE public.verifications SET entry_id = gen_random_uuid() WHERE entry_id IS NULL;
    -- Then add NOT NULL constraint
    ALTER TABLE public.verifications ALTER COLUMN entry_id SET NOT NULL;
  END IF;
END
$$;

-- Add new columns to verifications table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='verifications' AND column_name='selfie_url') THEN
    ALTER TABLE public.verifications ADD COLUMN selfie_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='verifications' AND column_name='id_document_url') THEN
    ALTER TABLE public.verifications ADD COLUMN id_document_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='verifications' AND column_name='handicap_proof_url') THEN
    ALTER TABLE public.verifications ADD COLUMN handicap_proof_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='verifications' AND column_name='auto_miss_applied') THEN
    ALTER TABLE public.verifications ADD COLUMN auto_miss_applied BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='verifications' AND column_name='auto_miss_at') THEN
    ALTER TABLE public.verifications ADD COLUMN auto_miss_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='verifications' AND column_name='evidence_captured_at') THEN
    ALTER TABLE public.verifications ADD COLUMN evidence_captured_at TIMESTAMP WITH TIME ZONE;
  END IF;
END
$$;

-- Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, email)
);

-- Create staff_codes table
CREATE TABLE IF NOT EXISTS public.staff_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  code_prefix TEXT NOT NULL,
  code_suffix CHAR(2) NOT NULL,
  staff_id UUID,
  competition_id UUID,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, code_prefix, code_suffix)
);

-- Create staff_code_attempts table  
CREATE TABLE IF NOT EXISTS public.staff_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL,
  code_prefix TEXT NOT NULL,
  code_suffix CHAR(2) NOT NULL,
  staff_code_id UUID,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create uploaded_files table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  upload_purpose TEXT NOT NULL CHECK (upload_purpose IN ('selfie', 'id_document', 'handicap_proof', 'video_evidence')),
  expires_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, storage_bucket, storage_path)
);

-- Create standalone indexes
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender) WHERE gender IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entries_payment_provider ON public.entries(payment_provider) WHERE payment_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verifications_evidence_captured_at ON public.verifications(evidence_captured_at);
CREATE INDEX IF NOT EXISTS idx_verifications_auto_miss_at ON public.verifications(auto_miss_at) WHERE auto_miss_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_club_id_active ON public.staff(club_id, active);
CREATE INDEX IF NOT EXISTS idx_staff_codes_club_id_active ON public.staff_codes(club_id, active);
CREATE INDEX IF NOT EXISTS idx_staff_codes_valid_period ON public.staff_codes(valid_from, valid_until) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_staff_code_attempts_entry_id ON public.staff_code_attempts(entry_id);
CREATE INDEX IF NOT EXISTS idx_staff_code_attempts_attempted_at ON public.staff_code_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON public.uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_expires_at ON public.uploaded_files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uploaded_files_purpose ON public.uploaded_files(upload_purpose);

-- Grant execute permissions on helper functions first
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_club_id() TO anon, authenticated, service_role;