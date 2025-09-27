-- Production Essential Functions and RLS Policies
-- Simplified migration for production setup

-- =================================
-- 1. CREATE ESSENTIAL FUNCTIONS
-- =================================

-- Helper functions for RLS policies
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
  SELECT public.get_current_user_role() IN ('ADMIN'::public.user_role, 'SUPER_ADMIN'::public.user_role);
$$;

-- User management functions
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    LEFT JOIN public.admin_user_permissions aup ON p.id = aup.user_id
    LEFT JOIN public.admin_permissions ap ON aup.permission_id = ap.id
    WHERE p.id = user_uuid
    AND (
      p.role = 'SUPER_ADMIN' OR
      (p.role = 'ADMIN' AND ap.name = permission_name)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_permissions()
RETURNS TABLE(permission_name text, permission_description text, category text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ap.name,
    ap.description,
    ap.category
  FROM public.profiles p
  LEFT JOIN public.admin_user_permissions aup ON p.id = aup.user_id
  LEFT JOIN public.admin_permissions ap ON aup.permission_id = ap.id
  WHERE p.id = auth.uid()
  AND p.role IN ('ADMIN', 'SUPER_ADMIN')
  UNION
  -- Super admins have all permissions
  SELECT 
    ap.name,
    ap.description,
    ap.category
  FROM public.admin_permissions ap
  WHERE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

-- New user trigger function  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    -- Enhanced name extraction from OAuth providers
    COALESCE(
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'given_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'family_name',
      NEW.raw_user_meta_data ->> 'surname'
    ),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'PLAYER')
  );
  RETURN NEW;
END;
$$;

-- Entry management functions
CREATE OR REPLACE FUNCTION public.calculate_attempt_number(p_email text, p_competition_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Calculate attempt number
  NEW.attempt_number := public.calculate_attempt_number(NEW.email, NEW.competition_id);
  
  -- Set repeat attempt flag
  NEW.is_repeat_attempt := (NEW.attempt_number > 1);
  
  RETURN NEW;
END;
$$;

-- =================================
-- 2. CREATE ESSENTIAL TRIGGERS
-- =================================

-- Trigger for new user creation (safe to recreate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for entry attempt numbering
DROP TRIGGER IF EXISTS set_entry_attempt_number ON public.entries;
CREATE TRIGGER set_entry_attempt_number
  BEFORE INSERT ON public.entries
  FOR EACH ROW EXECUTE PROCEDURE public.set_attempt_number();

-- =================================
-- 3. INSERT INITIAL DATA (SAFE)
-- =================================

-- Insert default admin permissions if they don't exist
INSERT INTO public.admin_permissions (name, description, category) VALUES
('user_management', 'Manage user accounts and profiles', 'users'),
('club_management', 'Manage golf clubs and partnerships', 'clubs'),
('competition_management', 'Manage competitions and entries', 'competitions'),
('financial_management', 'Manage payments and financial data', 'finance'),
('system_settings', 'Manage system-wide settings', 'system'),
('insurance_management', 'Manage insurance companies and policies', 'insurance'),
('reporting', 'Access reports and analytics', 'reports'),
('audit_logs', 'View system audit logs', 'security')
ON CONFLICT (name) DO NOTHING;

-- Insert default site settings if none exist
INSERT INTO public.site_settings (
  site_name,
  site_description,
  support_email,
  maintenance_mode,
  max_competitions_per_club,
  max_entry_fee_pounds,
  email_notifications_enabled,
  password_min_length
) 
SELECT 
  'Official Hole in 1',
  'Professional golf hole-in-one competitions',
  'support@officialholein1.com',
  false,
  10,
  500,
  true,
  8
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings LIMIT 1);

-- Insert default insurance company if none exists
INSERT INTO public.insurance_companies (
  name,
  contact_email,
  premium_rate_per_entry,
  active
)
SELECT 
  'Default Insurance Provider',
  'insurance@officialholein1.com',
  1.00,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.insurance_companies LIMIT 1);