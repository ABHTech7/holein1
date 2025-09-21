-- Fix trigger binding issue by updating function search path and recreating triggers

-- 1. Update the function with locked search_path
CREATE OR REPLACE FUNCTION public.log_security_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Only log role changes for profiles table
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' 
     AND OLD IS NOT NULL AND NEW IS NOT NULL
     AND (OLD.role IS DISTINCT FROM NEW.role) THEN
    INSERT INTO public.audit_events (
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      'role_change',
      NEW.id,
      'UPDATE',
      jsonb_build_object('old_role', OLD.role),
      jsonb_build_object('new_role', NEW.role),
      auth.uid()
    );
  END IF;
  
  -- Log club creation/modification (no role field access)
  IF TG_TABLE_NAME = 'clubs' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO public.audit_events (
      entity_type,
      entity_id,
      action,
      new_values,
      old_values,
      user_id
    ) VALUES (
      'club',
      NEW.id,
      TG_OP,
      row_to_json(NEW),
      CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      auth.uid()
    );
  END IF;
  
  -- Log lead modifications (no role field access)
  IF TG_TABLE_NAME = 'leads' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO public.audit_events (
      entity_type,
      entity_id,
      action,
      new_values,
      old_values,
      user_id
    ) VALUES (
      'lead',
      NEW.id,
      TG_OP,
      row_to_json(NEW),
      CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Drop and recreate all triggers with schema-qualified function calls

-- Clubs table trigger
DROP TRIGGER IF EXISTS log_club_security_events ON public.clubs;
CREATE TRIGGER log_club_security_events
AFTER INSERT OR UPDATE OR DELETE ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.log_security_events();

-- Leads table trigger (if it exists)
DROP TRIGGER IF EXISTS log_lead_security_events ON public.leads;
CREATE TRIGGER log_lead_security_events
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_security_events();

-- Profiles table trigger (if it exists)
DROP TRIGGER IF EXISTS log_profile_security_events ON public.profiles;
CREATE TRIGGER log_profile_security_events
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_security_events();