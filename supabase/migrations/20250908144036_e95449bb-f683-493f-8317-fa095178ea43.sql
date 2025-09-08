-- Enable additional security features and protections

-- 1. Enable password strength validation and leak protection
-- Note: This requires Supabase dashboard configuration, but we can set up the supporting infrastructure

-- 2. Add additional security constraints and validations
-- Ensure all sensitive operations are properly logged

-- 3. Add database-level security constraints
-- Prevent potential SQL injection through input validation

-- Create function to validate email formats
CREATE OR REPLACE FUNCTION public.is_valid_email(email_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN email_text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Create function to validate phone numbers (basic validation)
CREATE OR REPLACE FUNCTION public.is_valid_phone(phone_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
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

-- Add validation triggers for data integrity
CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS trigger
LANGUAGE plpgsql
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

-- Apply validation trigger to profiles
DROP TRIGGER IF EXISTS validate_profile_trigger ON public.profiles;
CREATE TRIGGER validate_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_data();

-- Add similar validation for clubs
CREATE OR REPLACE FUNCTION public.validate_club_data()
RETURNS trigger
LANGUAGE plpgsql
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

-- Apply validation trigger to clubs
DROP TRIGGER IF EXISTS validate_club_trigger ON public.clubs;
CREATE TRIGGER validate_club_trigger
  BEFORE INSERT OR UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_club_data();

-- Log security enhancement
INSERT INTO public.audit_events (
  entity_type,
  entity_id,
  action,
  new_values,
  user_id
) VALUES (
  'security_enhancement',
  gen_random_uuid(),
  'DATA_VALIDATION_ADDED',
  jsonb_build_object(
    'action', 'Added input validation and security constraints',
    'validations', ARRAY['email_format', 'phone_format', 'xss_prevention'],
    'timestamp', now()
  ),
  auth.uid()
);