-- Fix critical security issues identified in security review

-- 1. Drop the insecure clubs_public view and replace with secure function access
DROP VIEW IF EXISTS public.clubs_public;

-- 2. Improve the get_safe_clubs_data function security
-- Remove SECURITY DEFINER to avoid privilege escalation issues
DROP FUNCTION IF EXISTS public.get_safe_clubs_data();

CREATE OR REPLACE FUNCTION public.get_safe_clubs_data()
RETURNS TABLE(id uuid, name text, website text, logo_url text, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  -- Only return basic, non-sensitive club information
  SELECT 
    c.id,
    c.name,
    c.website,
    c.logo_url,
    c.created_at
  FROM public.clubs c
  WHERE c.archived = false 
    AND c.active = true
  ORDER BY c.created_at DESC;
$function$;

-- 3. Add security audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log admin privilege escalations
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' AND OLD.role != NEW.role THEN
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

-- Create triggers for security logging
DROP TRIGGER IF EXISTS log_profile_security_events ON public.profiles;
CREATE TRIGGER log_profile_security_events
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_security_events();

DROP TRIGGER IF EXISTS log_club_security_events ON public.clubs;
CREATE TRIGGER log_club_security_events
  AFTER INSERT OR UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_security_events();

-- 4. Create request monitoring table for rate limiting
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  user_id uuid,
  ip_address inet,
  user_agent text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only allow admin access to security logs
CREATE POLICY "Admin access to security logs"
ON public.security_logs
FOR ALL
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

-- 5. Add security monitoring indexes
CREATE INDEX IF NOT EXISTS idx_audit_events_security 
ON public.audit_events(entity_type, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_event_type 
ON public.security_logs(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_ip 
ON public.security_logs(user_id, ip_address, created_at DESC);

-- 6. Add function to safely get current user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role_safe(user_uuid uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = user_uuid LIMIT 1;
$function$;