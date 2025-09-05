-- Create custom types
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'CLUB', 'PLAYER');
CREATE TYPE public.competition_status AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED');
CREATE TYPE public.claim_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE public.lead_status AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'LOST');

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role NOT NULL DEFAULT 'PLAYER',
  club_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competitions table
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status competition_status NOT NULL DEFAULT 'SCHEDULED',
  entry_fee DECIMAL(10,2) DEFAULT 0,
  max_participants INTEGER,
  prize_pool DECIMAL(10,2),
  rules JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create entries table
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid BOOLEAN NOT NULL DEFAULT false,
  payment_date TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(competition_id, player_id)
);

-- Create claims table
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  claim_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  witness_name TEXT,
  witness_contact TEXT,
  status claim_status NOT NULL DEFAULT 'PENDING',
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  status lead_status NOT NULL DEFAULT 'NEW',
  notes TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_events table
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint for profiles.club_id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_club_id_fkey 
FOREIGN KEY (club_id) REFERENCES public.clubs(id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to get user club_id
CREATE OR REPLACE FUNCTION public.get_current_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (public.get_current_user_role() = 'ADMIN');

-- RLS Policies for clubs
CREATE POLICY "Everyone can view clubs" ON public.clubs
FOR SELECT USING (true);

CREATE POLICY "Admins can manage clubs" ON public.clubs
FOR ALL USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Club members can view their club" ON public.clubs
FOR SELECT USING (id = public.get_current_user_club_id());

-- RLS Policies for competitions
CREATE POLICY "Everyone can view active competitions" ON public.competitions
FOR SELECT USING (true);

CREATE POLICY "Admins can manage all competitions" ON public.competitions
FOR ALL USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Club members can manage their competitions" ON public.competitions
FOR ALL USING (club_id = public.get_current_user_club_id() AND public.get_current_user_role() = 'CLUB');

-- RLS Policies for entries
CREATE POLICY "Players can view their own entries" ON public.entries
FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Players can create their own entries" ON public.entries
FOR INSERT WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can update their own entries" ON public.entries
FOR UPDATE USING (player_id = auth.uid());

CREATE POLICY "Club members can view entries for their competitions" ON public.entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.competitions 
    WHERE id = competition_id 
    AND club_id = public.get_current_user_club_id()
  ) AND public.get_current_user_role() = 'CLUB'
);

CREATE POLICY "Admins can view all entries" ON public.entries
FOR SELECT USING (public.get_current_user_role() = 'ADMIN');

-- RLS Policies for claims
CREATE POLICY "Players can view their own claims" ON public.claims
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.entries 
    WHERE id = entry_id AND player_id = auth.uid()
  )
);

CREATE POLICY "Players can create claims for their entries" ON public.claims
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entries 
    WHERE id = entry_id AND player_id = auth.uid()
  )
);

CREATE POLICY "Club members can view claims for their competitions" ON public.claims
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    JOIN public.competitions c ON e.competition_id = c.id
    WHERE e.id = entry_id 
    AND c.club_id = public.get_current_user_club_id()
  ) AND public.get_current_user_role() = 'CLUB'
);

CREATE POLICY "Club members can update claims for their competitions" ON public.claims
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    JOIN public.competitions c ON e.competition_id = c.id
    WHERE e.id = entry_id 
    AND c.club_id = public.get_current_user_club_id()
  ) AND public.get_current_user_role() = 'CLUB'
);

CREATE POLICY "Admins can manage all claims" ON public.claims
FOR ALL USING (public.get_current_user_role() = 'ADMIN');

-- RLS Policies for leads
CREATE POLICY "Club members can view their leads" ON public.leads
FOR SELECT USING (club_id = public.get_current_user_club_id() AND public.get_current_user_role() = 'CLUB');

CREATE POLICY "Club members can manage their leads" ON public.leads
FOR ALL USING (club_id = public.get_current_user_club_id() AND public.get_current_user_role() = 'CLUB');

CREATE POLICY "Admins can view all leads" ON public.leads
FOR SELECT USING (public.get_current_user_role() = 'ADMIN');

-- RLS Policies for audit_events
CREATE POLICY "Admins can view all audit events" ON public.audit_events
FOR SELECT USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Users can view their own audit events" ON public.audit_events
FOR SELECT USING (user_id = auth.uid());

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'PLAYER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_club_id ON public.profiles(club_id);
CREATE INDEX idx_competitions_club_id ON public.competitions(club_id);
CREATE INDEX idx_competitions_status ON public.competitions(status);
CREATE INDEX idx_entries_competition_id ON public.entries(competition_id);
CREATE INDEX idx_entries_player_id ON public.entries(player_id);
CREATE INDEX idx_claims_entry_id ON public.claims(entry_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_leads_club_id ON public.leads(club_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX idx_audit_events_entity ON public.audit_events(entity_type, entity_id);