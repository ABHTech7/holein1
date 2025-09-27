-- Production Schema Essentials - Functions and Basic Policies Only

-- =================================
-- 1. CREATE HELPER FUNCTIONS
-- =================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_club_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path TO 'public'
AS $$
  SELECT club_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(public.get_current_user_role() IN ('ADMIN'::public.user_role, 'SUPER_ADMIN'::public.user_role), false);
$$;

-- =================================
-- 2. CREATE ESSENTIAL BUSINESS FUNCTIONS
-- =================================

-- Profile management
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'given_name',
      split_part(NEW.raw_user_meta_data ->> 'name', ' ', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'family_name',
      split_part(NEW.raw_user_meta_data ->> 'name', ' ', 2)
    ),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'PLAYER')
  );
  RETURN NEW;
END;
$$;

-- Entry attempt calculation
CREATE OR REPLACE FUNCTION public.calculate_attempt_number(p_email text, p_competition_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  FROM public.entries
  WHERE lower(email) = lower(p_email)
    AND competition_id = p_competition_id;
$$;

CREATE OR REPLACE FUNCTION public.set_attempt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.attempt_number := public.calculate_attempt_number(NEW.email, NEW.competition_id);
  NEW.is_repeat_attempt := (NEW.attempt_number > 1);
  RETURN NEW;
END;
$$;

-- =================================
-- 3. CREATE/UPDATE TRIGGERS
-- =================================

-- Drop and recreate auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Drop and recreate entry trigger  
DROP TRIGGER IF EXISTS set_entry_attempt_number ON public.entries;
CREATE TRIGGER set_entry_attempt_number
  BEFORE INSERT ON public.entries
  FOR EACH ROW EXECUTE PROCEDURE public.set_attempt_number();

-- =================================
-- 4. CREATE STORAGE BUCKETS
-- =================================

-- Create essential storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES 
('club-logos', 'club-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
('competition-images', 'competition-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
('verification-documents', 'verification-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
('user-uploads', 'user-uploads', false, 10485760, NULL)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;