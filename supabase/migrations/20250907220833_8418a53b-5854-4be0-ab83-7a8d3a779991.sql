-- Phase 1: Database Schema Updates for Refined Player Journey

-- Add missing fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age_years INTEGER CHECK (age_years >= 16 AND age_years <= 100),
ADD COLUMN IF NOT EXISTS phone_e164 TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.age_years IS 'Player age in years, must be 16-100 for amateur eligibility';
COMMENT ON COLUMN public.profiles.phone_e164 IS 'Phone number in E.164 international format';

-- Update entries table to support the new flow
ALTER TABLE public.entries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS terms_version TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Create verification table for win claims
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.entries(id) ON DELETE CASCADE,
  witnesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  staff_code TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on verification table
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for verifications
CREATE POLICY "Players can create verifications for their entries" ON public.verifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entries e 
      WHERE e.id = verifications.entry_id 
      AND e.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can view their own verifications" ON public.verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entries e 
      WHERE e.id = verifications.entry_id 
      AND e.player_id = auth.uid()
    )
  );

CREATE POLICY "Club members can view verifications for their competitions" ON public.verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.entries e 
      JOIN public.competitions c ON e.competition_id = c.id 
      WHERE e.id = verifications.entry_id 
      AND c.club_id = get_current_user_club_id() 
      AND get_current_user_role() = 'CLUB'
    )
  );

CREATE POLICY "Admins and clubs can update verifications" ON public.verifications
  FOR UPDATE USING (
    get_current_user_role() = 'ADMIN' OR 
    EXISTS (
      SELECT 1 FROM public.entries e 
      JOIN public.competitions c ON e.competition_id = c.id 
      WHERE e.id = verifications.entry_id 
      AND c.club_id = get_current_user_club_id() 
      AND get_current_user_role() = 'CLUB'
    )
  );

CREATE POLICY "Admins can view all verifications" ON public.verifications
  FOR SELECT USING (get_current_user_role() = 'ADMIN');

-- Add trigger for updated_at on verifications
CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_verifications_entry_id ON public.verifications(entry_id);
CREATE INDEX IF NOT EXISTS idx_entries_status ON public.entries(status);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_e164);

-- Update entries table to support better status tracking
ALTER TABLE public.entries 
ADD COLUMN IF NOT EXISTS outcome_self TEXT,
ADD COLUMN IF NOT EXISTS outcome_official TEXT,
ADD COLUMN IF NOT EXISTS outcome_reported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_window_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_window_end TIMESTAMPTZ;