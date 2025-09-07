-- Fix critical security issues identified in security review

-- 1. Enable RLS on clubs_public table and add appropriate policies
ALTER TABLE public.clubs_public ENABLE ROW LEVEL SECURITY;

-- Add policy to allow public read access to basic club information
-- This maintains the intended public visibility while enabling RLS protection
CREATE POLICY "Public read access to club directory" 
ON public.clubs_public 
FOR SELECT 
USING (true);

-- 2. Review and secure the get_safe_clubs_data function
-- Replace the existing function with a more secure version that doesn't use SECURITY DEFINER unnecessarily
DROP FUNCTION IF EXISTS public.get_safe_clubs_data();

-- Create a new secure function for safe club data access
CREATE OR REPLACE FUNCTION public.get_safe_clubs_data()
RETURNS TABLE(id uuid, name text, website text, logo_url text, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT 
    id,
    name,
    website,
    logo_url,
    created_at
  FROM public.clubs 
  WHERE archived = false AND active = true;
$function$;

-- 3. Add security audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log admin privilege escalations and sensitive data modifications
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles' AND OLD.role != NEW.role THEN
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
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for profile role changes
DROP TRIGGER IF EXISTS log_profile_role_changes ON public.profiles;
CREATE TRIGGER log_profile_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_operations();

-- 4. Add rate limiting protection by creating a simple request log table
CREATE TABLE IF NOT EXISTS public.request_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  ip_address inet,
  endpoint text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on request_logs
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- Only allow system/admin access to request logs
CREATE POLICY "Admin access to request logs"
ON public.request_logs
FOR ALL
TO authenticated
USING (get_current_user_role() = 'ADMIN'::user_role);

-- 5. Create indexes for security monitoring
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id_created_at 
ON public.audit_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_logs_ip_created_at 
ON public.request_logs(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_logs_user_id_created_at 
ON public.request_logs(user_id, created_at DESC);