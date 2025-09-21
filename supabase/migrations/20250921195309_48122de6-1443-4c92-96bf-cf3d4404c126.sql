-- Fix the log_security_events function to prevent OLD.role errors on non-profiles tables
CREATE OR REPLACE FUNCTION public.log_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log admin privilege escalations (only for profiles table with role field)
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
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;