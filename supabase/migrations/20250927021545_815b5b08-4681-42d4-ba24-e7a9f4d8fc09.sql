-- Fix Security Warnings

-- 1. Fix Function Search Path Mutable warning
-- Update functions to have proper search_path set

CREATE OR REPLACE FUNCTION sync_profile_role_to_user_roles()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle role changes
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Remove old role
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = OLD.role;
    -- Add new role
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, NEW.role) 
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Handle new profiles  
  IF TG_OP = 'INSERT' AND NEW.role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, NEW.role) 
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update any other functions that might have mutable search paths
-- These are the helper functions used throughout the schema

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_club_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;