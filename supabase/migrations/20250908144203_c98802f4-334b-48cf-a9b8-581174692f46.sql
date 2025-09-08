-- Fix function search path security warnings
-- Set search_path explicitly for all custom functions to prevent SQL injection

-- Fix validation functions
CREATE OR REPLACE FUNCTION public.is_valid_email(email_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN email_text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_phone(phone_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow null/empty phones
  IF phone_text IS NULL OR phone_text = '' THEN
    RETURN true;
  END IF;
  
  -- Basic phone validation - allow digits, spaces, dashes, parentheses, plus
  RETURN phone_text ~* '^[\+]?[0-9\s\-\(\)]{7,20}$';
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format
  IF NOT is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Validate phone if provided
  IF NOT is_valid_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Ensure names don't contain potentially malicious content
  IF NEW.first_name IS NOT NULL AND (NEW.first_name ~* '<[^>]*>' OR NEW.first_name ~* 'script') THEN
    RAISE EXCEPTION 'Invalid characters in first name';
  END IF;
  
  IF NEW.last_name IS NOT NULL AND (NEW.last_name ~* '<[^>]*>' OR NEW.last_name ~* 'script') THEN
    RAISE EXCEPTION 'Invalid characters in last name';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_club_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format if provided
  IF NEW.email IS NOT NULL AND NOT is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Validate phone if provided
  IF NOT is_valid_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Basic validation for club name
  IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) < 2 THEN
    RAISE EXCEPTION 'Club name must be at least 2 characters long';
  END IF;
  
  -- Prevent potentially malicious content in club name
  IF NEW.name ~* '<[^>]*>' OR NEW.name ~* 'script' THEN
    RAISE EXCEPTION 'Invalid characters in club name';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Log the security fix
INSERT INTO public.audit_events (
  entity_type,
  entity_id,
  action,
  new_values,
  user_id
) VALUES (
  'security_fix',
  gen_random_uuid(),
  'FUNCTION_SEARCH_PATH_SECURED',
  jsonb_build_object(
    'action', 'Fixed search_path security warnings',
    'functions_updated', ARRAY['is_valid_email', 'is_valid_phone', 'validate_profile_data', 'validate_club_data'],
    'timestamp', now()
  ),
  auth.uid()
);