-- Fix security trigger and then clean up venues/clubs
-- Step 1: Fix the security trigger to handle missing fields gracefully
CREATE OR REPLACE FUNCTION public.log_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log admin privilege escalations (only if both OLD and NEW have role field)
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
  
  -- Log club creation/modification
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