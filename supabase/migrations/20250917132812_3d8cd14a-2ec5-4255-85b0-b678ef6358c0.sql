-- Fix CLUB user data updates and prevent duplicates
-- This migration addresses profile update issues and data integrity

BEGIN;

-- 1. Add ADMIN policy for profile updates
CREATE POLICY "admin_update_any_profile" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'ADMIN'::user_role)
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);

-- 2. Add unique constraint on email field (after cleaning up duplicates)
-- First, let's identify and fix any existing email duplicates
DO $$
DECLARE
    duplicate_record RECORD;
    keep_id UUID;
    cleanup_count INTEGER := 0;
BEGIN
    -- Handle duplicate emails by keeping the most recent profile
    FOR duplicate_record IN 
        SELECT email, COUNT(*) as count_duplicates
        FROM public.profiles 
        WHERE email IS NOT NULL 
        GROUP BY email 
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Found % duplicate profiles with email: %', duplicate_record.count_duplicates, duplicate_record.email;
        
        -- Keep the most recently updated profile
        SELECT id INTO keep_id
        FROM public.profiles 
        WHERE email = duplicate_record.email 
        ORDER BY updated_at DESC, created_at DESC 
        LIMIT 1;
        
        -- Delete older duplicates
        DELETE FROM public.profiles 
        WHERE email = duplicate_record.email 
        AND id != keep_id;
        
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        RAISE NOTICE 'Cleaned up % duplicate profiles for email: %', cleanup_count, duplicate_record.email;
    END LOOP;
END $$;

-- Now add the unique constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- 3. Fix the corrupted "Sarah Test" profile data
DO $$
DECLARE
    sarah_profile_id UUID;
    club1_auth_id UUID;
BEGIN
    -- Find the corrupted Sarah Test profile
    SELECT id INTO sarah_profile_id
    FROM public.profiles 
    WHERE first_name = 'Sarah' 
    AND last_name = 'Test' 
    AND email = 'mr.andrewbrooks@gmail.com'
    AND role = 'CLUB';
    
    -- Find the club1@holein1.test auth user
    SELECT id INTO club1_auth_id
    FROM auth.users 
    WHERE email = 'club1@holein1.test';
    
    IF sarah_profile_id IS NOT NULL AND club1_auth_id IS NOT NULL THEN
        -- Check if this is the same user (profile.id should match auth.users.id)
        IF sarah_profile_id = club1_auth_id THEN
            -- Restore the correct profile data
            UPDATE public.profiles 
            SET 
                email = 'club1@holein1.test',
                first_name = 'Shrigley Hall',
                last_name = 'Golf Club',
                updated_at = now()
            WHERE id = sarah_profile_id;
            
            RAISE NOTICE 'Restored corrupted club1@holein1.test profile data';
        ELSE
            -- This is a separate corrupted profile, delete it
            DELETE FROM public.profiles WHERE id = sarah_profile_id;
            RAISE NOTICE 'Deleted corrupted Sarah Test profile';
        END IF;
    END IF;
END $$;

-- 4. Update the validation function to handle email uniqueness conflicts
CREATE OR REPLACE FUNCTION public.validate_profile_data_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate email format (enhanced)
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
    IF NOT NEW.email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Check for email uniqueness (only for different users)
    IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND id != NEW.id) THEN
        RAISE EXCEPTION 'Email address already exists: %', NEW.email;
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND id != NEW.id) THEN
        RAISE EXCEPTION 'Email address already exists: %', NEW.email;
      END IF;
    END IF;
  END IF;
  
  -- Validate and clean names
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name := validate_text_input(NEW.first_name, 50);
    -- Additional name-specific validation
    IF NEW.first_name !~ '^[a-zA-ZÀ-ÿ\s\-''\.]+$' THEN
      RAISE EXCEPTION 'First name contains invalid characters';
    END IF;
  END IF;
  
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name := validate_text_input(NEW.last_name, 50);
    -- Additional name-specific validation
    IF NEW.last_name !~ '^[a-zA-ZÀ-ÿ\s\-''\.]+$' THEN
      RAISE EXCEPTION 'Last name contains invalid characters';
    END IF;
  END IF;
  
  -- Validate phone (enhanced)
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := TRIM(NEW.phone);
    IF NEW.phone != '' AND NOT NEW.phone ~ '^[\+\-\s\(\)\d]+$' THEN
      RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
  END IF;
  
  -- Validate phone_e164
  IF NEW.phone_e164 IS NOT NULL THEN
    NEW.phone_e164 := TRIM(NEW.phone_e164);
    IF NEW.phone_e164 != '' AND NOT NEW.phone_e164 ~ '^[\+\-\s\(\)\d]+$' THEN
      RAISE EXCEPTION 'Invalid phone_e164 format: %', NEW.phone_e164;
    END IF;
  END IF;
  
  -- Validate numeric fields
  IF NEW.age_years IS NOT NULL THEN
    IF NEW.age_years < 16 OR NEW.age_years > 120 THEN
      RAISE EXCEPTION 'Age must be between 16 and 120';
    END IF;
  END IF;
  
  IF NEW.handicap IS NOT NULL THEN
    IF NEW.handicap < -10 OR NEW.handicap > 54 THEN
      RAISE EXCEPTION 'Handicap must be between -10 and 54';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. Create a helper function for safe profile updates/upserts
CREATE OR REPLACE FUNCTION public.upsert_profile_safe(
  user_id UUID,
  profile_email TEXT,
  profile_first_name TEXT DEFAULT NULL,
  profile_last_name TEXT DEFAULT NULL,
  profile_phone TEXT DEFAULT NULL,
  profile_phone_e164 TEXT DEFAULT NULL,
  profile_role user_role DEFAULT 'PLAYER'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_id UUID;
BEGIN
  -- Use INSERT ... ON CONFLICT DO UPDATE for safe upsert
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    phone, 
    phone_e164, 
    role,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    profile_email,
    profile_first_name,
    profile_last_name,
    profile_phone,
    profile_phone_e164,
    profile_role,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    phone_e164 = COALESCE(EXCLUDED.phone_e164, profiles.phone_e164),
    role = EXCLUDED.role,
    updated_at = now()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$function$;

-- Add audit logging for profile changes
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log significant profile changes
  IF TG_OP = 'UPDATE' THEN
    -- Log email changes
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        user_id,
        ip_address
      ) VALUES (
        'profile_email_change',
        NEW.id,
        'UPDATE',
        jsonb_build_object('old_email', OLD.email),
        jsonb_build_object('new_email', NEW.email),
        auth.uid(),
        inet_client_addr()
      );
    END IF;
    
    -- Log role changes (already handled in existing trigger, but ensure consistency)
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        user_id,
        ip_address
      ) VALUES (
        'profile_role_change',
        NEW.id,
        'UPDATE',
        jsonb_build_object('old_role', OLD.role),
        jsonb_build_object('new_role', NEW.role),
        auth.uid(),
        inet_client_addr()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the audit trigger
DROP TRIGGER IF EXISTS audit_profile_changes_trigger ON public.profiles;
CREATE TRIGGER audit_profile_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_changes();

COMMIT;