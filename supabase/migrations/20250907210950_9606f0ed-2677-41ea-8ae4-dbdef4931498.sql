-- Add required fields to entries table for the new player journey
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS amount_minor INTEGER;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS attempt_window_start TIMESTAMPTZ;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS attempt_window_end TIMESTAMPTZ;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS outcome_self TEXT;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS outcome_official TEXT;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS outcome_reported_at TIMESTAMPTZ;

-- Add constraints for outcome fields
ALTER TABLE public.entries ADD CONSTRAINT entries_outcome_self_check 
  CHECK (outcome_self IS NULL OR outcome_self IN ('win', 'miss', 'auto'));
ALTER TABLE public.entries ADD CONSTRAINT entries_outcome_official_check 
  CHECK (outcome_official IS NULL OR outcome_official IN ('win', 'miss', 'pending'));

-- Add required fields to profiles table for enhanced user data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS handicap NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN DEFAULT false;

-- Create venues table for venue_slug mapping
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on venues table
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Create policies for venues table
CREATE POLICY "Everyone can view venues" 
ON public.venues 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage venues" 
ON public.venues 
FOR ALL 
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "Club members can manage their venues" 
ON public.venues 
FOR ALL 
USING (club_id = get_current_user_club_id() AND get_current_user_role() = 'CLUB'::user_role);

-- Create verifications table for win claims
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.entries(id) ON DELETE CASCADE,
  witnesses JSONB NOT NULL,
  staff_code TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id)
);

-- Add constraints for verification status
ALTER TABLE public.verifications ADD CONSTRAINT verifications_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Enable RLS on verifications table
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for verifications table
CREATE POLICY "Admins can view all verifications" 
ON public.verifications 
FOR SELECT 
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "Club members can view verifications for their competitions" 
ON public.verifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.entries e
  JOIN public.competitions c ON e.competition_id = c.id
  WHERE e.id = verifications.entry_id 
  AND c.club_id = get_current_user_club_id()
  AND get_current_user_role() = 'CLUB'::user_role
));

CREATE POLICY "Players can view their own verifications" 
ON public.verifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.entries e
  WHERE e.id = verifications.entry_id 
  AND e.player_id = auth.uid()
));

CREATE POLICY "Players can create verifications for their entries" 
ON public.verifications 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.entries e
  WHERE e.id = verifications.entry_id 
  AND e.player_id = auth.uid()
));

CREATE POLICY "Admins and clubs can update verifications" 
ON public.verifications 
FOR UPDATE 
USING (
  get_current_user_role() = 'ADMIN'::user_role 
  OR (
    EXISTS (
      SELECT 1 FROM public.entries e
      JOIN public.competitions c ON e.competition_id = c.id
      WHERE e.id = verifications.entry_id 
      AND c.club_id = get_current_user_club_id()
      AND get_current_user_role() = 'CLUB'::user_role
    )
  )
);

-- Add trigger for updated_at on venues table
CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on verifications table
CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();