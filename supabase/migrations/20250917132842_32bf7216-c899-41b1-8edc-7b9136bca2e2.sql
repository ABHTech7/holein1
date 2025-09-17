-- Fix security warnings: Function search path mutable
-- Set search_path for functions that are missing it

BEGIN;

-- Fix the new upsert_profile_safe function search path
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

-- Fix the audit_profile_changes function search path
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

COMMIT;