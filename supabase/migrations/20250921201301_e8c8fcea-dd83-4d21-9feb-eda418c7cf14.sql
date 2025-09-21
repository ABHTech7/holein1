-- Fix log_security_events function with proper guards and exception handling
CREATE OR REPLACE FUNCTION public.log_security_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Only process row-level triggers
  IF TG_LEVEL = 'ROW' THEN
    BEGIN
      -- Only log role changes for profiles table updates
      IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' 
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
      
    EXCEPTION WHEN others THEN
      -- Log audit failures but don't break the original operation
      RAISE WARNING 'Audit logging failed: %', SQLERRM;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Drop existing triggers
DROP TRIGGER IF EXISTS log_security_events_trigger ON public.clubs;
DROP TRIGGER IF EXISTS log_security_events_trigger ON public.leads;  
DROP TRIGGER IF EXISTS log_security_events_trigger ON public.profiles;

-- Recreate triggers with schema-qualified function names to force rebinding
CREATE TRIGGER log_security_events_trigger
  AFTER INSERT OR UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_security_events();

CREATE TRIGGER log_security_events_trigger
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_security_events();

CREATE TRIGGER log_security_events_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_security_events();