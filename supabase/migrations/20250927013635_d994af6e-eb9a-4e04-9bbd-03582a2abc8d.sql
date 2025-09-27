-- Phase 1: Fix Database Structure
-- Create missing venues table that's causing logo upload failures

CREATE TABLE IF NOT EXISTS public.venues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);

-- Enable RLS on venues table
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for venues
CREATE POLICY "Admins can manage all venues" 
ON public.venues 
FOR ALL 
USING (get_current_user_is_admin())
WITH CHECK (get_current_user_is_admin());

CREATE POLICY "Club members can manage their venues" 
ON public.venues 
FOR ALL 
USING ((club_id = get_current_user_club_id()) AND (get_current_user_role() = 'CLUB'::user_role))
WITH CHECK ((club_id = get_current_user_club_id()) AND (get_current_user_role() = 'CLUB'::user_role));

CREATE POLICY "Club members can view their venues" 
ON public.venues 
FOR SELECT 
USING ((club_id = get_current_user_club_id()) AND (get_current_user_role() = 'CLUB'::user_role));

-- Add foreign key constraint
ALTER TABLE public.venues 
ADD CONSTRAINT venues_club_id_fkey 
FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_venues_club_id ON public.venues(club_id);
CREATE INDEX idx_venues_active ON public.venues(active);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_venues_updated_at
    BEFORE UPDATE ON public.venues
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();