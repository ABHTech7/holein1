-- Phase 1: Remove Complex Security Monitoring Tables
DROP TABLE IF EXISTS public.security_logs CASCADE;
DROP TABLE IF EXISTS public.data_access_log CASCADE;

-- Phase 2: Remove Staff Verification System Tables
DROP TABLE IF EXISTS public.staff_code_attempts CASCADE;
DROP TABLE IF EXISTS public.staff_codes CASCADE;

-- Phase 3: Remove Complex Demo Management Table
DROP TABLE IF EXISTS public.demo_data_sessions CASCADE;

-- Phase 4: Remove Unused Legacy Tables
DROP TABLE IF EXISTS public.venues CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Remove any functions that depend on deleted tables
DROP FUNCTION IF EXISTS public.log_security_event(text, uuid, jsonb, inet);
DROP FUNCTION IF EXISTS public.validate_file_upload(text, text, integer, text);

-- Update audit_profile_changes function to be simpler
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log essential profile changes only
  IF TG_OP = 'UPDATE' THEN
    -- Log email changes
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        user_id
      ) VALUES (
        'profile_email_change',
        NEW.id,
        'UPDATE',
        jsonb_build_object('old_email', OLD.email),
        jsonb_build_object('new_email', NEW.email),
        auth.uid()
      );
    END IF;
    
    -- Log role changes
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        user_id
      ) VALUES (
        'profile_role_change',
        NEW.id,
        'UPDATE',
        jsonb_build_object('old_role', OLD.role),
        jsonb_build_object('new_role', NEW.role),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;