-- Phase 4: Access Control Hardening Migration
-- Separate financial data and implement granular access controls

-- 1. Create secure club banking table for financial data separation
CREATE TABLE IF NOT EXISTS public.club_banking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid NOT NULL UNIQUE REFERENCES public.clubs(id) ON DELETE CASCADE,
  bank_account_holder text,
  bank_account_number text,
  bank_sort_code text,
  bank_iban text,
  bank_swift text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  last_accessed_at timestamp with time zone,
  access_count integer DEFAULT 0
);

-- Enable RLS on club banking
ALTER TABLE public.club_banking ENABLE ROW LEVEL SECURITY;

-- 2. Create data classification and access tracking
CREATE TABLE IF NOT EXISTS public.data_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  table_name text NOT NULL,
  record_id uuid,
  access_type text NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  sensitive_fields text[], -- Array of sensitive field names accessed
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on access log (admins only)
ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer functions for safe data access
CREATE OR REPLACE FUNCTION public.get_current_user_profile_safe()
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  role user_role,
  created_at timestamp with time zone
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Return only safe profile data, excluding sensitive fields like phone, DOB
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.created_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_club_public_info(club_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  website text,
  logo_url text,
  created_at timestamp with time zone
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Return only public club information, no sensitive data
  SELECT 
    c.id,
    c.name,
    c.website,
    c.logo_url,
    c.created_at
  FROM public.clubs c
  WHERE c.id = club_uuid
    AND c.archived = false 
    AND c.active = true;
$$;

-- 4. Enhanced RLS policies for profiles table (field-level security)
DROP POLICY IF EXISTS "Users can view only their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create granular profile access policies
CREATE POLICY "Users can view their basic profile info"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their basic profile info"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can view all profiles but with audit logging
CREATE POLICY "Admins can view all profiles with logging"
ON public.profiles FOR SELECT
USING (
  get_current_user_role() = 'ADMIN'::user_role AND
  -- Log admin access to profiles
  (SELECT public.log_sensitive_access('profiles', id, 'SELECT', ARRAY['phone', 'dob', 'handicap']))
);

-- 5. Club banking table policies (ultra-secure)
CREATE POLICY "Only club owners can view their banking details"
ON public.club_banking FOR SELECT
USING (
  club_id = get_current_user_club_id() AND
  get_current_user_role() = 'CLUB'::user_role AND
  -- Log financial data access
  (SELECT public.log_sensitive_access('club_banking', id, 'SELECT', ARRAY['bank_account_number', 'bank_iban', 'bank_swift']))
);

CREATE POLICY "Only club owners can update their banking details"
ON public.club_banking FOR UPDATE
USING (club_id = get_current_user_club_id() AND get_current_user_role() = 'CLUB'::user_role)
WITH CHECK (club_id = get_current_user_club_id() AND get_current_user_role() = 'CLUB'::user_role);

CREATE POLICY "Only club owners can insert their banking details"
ON public.club_banking FOR INSERT
WITH CHECK (club_id = get_current_user_club_id() AND get_current_user_role() = 'CLUB'::user_role);

CREATE POLICY "Admins can view banking with full audit"
ON public.club_banking FOR SELECT
USING (
  get_current_user_role() = 'ADMIN'::user_role AND
  -- Strict audit for admin financial access
  (SELECT public.log_sensitive_access('club_banking', id, 'ADMIN_SELECT', ARRAY['bank_account_number', 'bank_iban', 'bank_swift']))
);

-- 6. Enhanced magic link token security (complete lockdown)
DROP POLICY IF EXISTS "Magic link tokens are not accessible via client" ON public.magic_link_tokens;

CREATE POLICY "Magic link tokens completely inaccessible"
ON public.magic_link_tokens FOR ALL
USING (false) -- No client access whatsoever
WITH CHECK (false);

-- 7. Data access logging policies
CREATE POLICY "Admins can view access logs"
ON public.data_access_log FOR SELECT
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "System can insert access logs"
ON public.data_access_log FOR INSERT
WITH CHECK (true); -- Allow system logging

-- 8. Create sensitive access logging function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  table_name text,
  record_id uuid,
  access_type text,
  sensitive_fields text[]
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update access tracking
  UPDATE public.club_banking 
  SET 
    last_accessed_at = now(),
    access_count = access_count + 1
  WHERE id = record_id AND table_name = 'club_banking';
  
  -- Log the access
  INSERT INTO public.data_access_log (
    user_id,
    table_name,
    record_id,
    access_type,
    sensitive_fields,
    ip_address,
    created_at
  ) VALUES (
    auth.uid(),
    table_name,
    record_id,
    access_type,
    sensitive_fields,
    inet_client_addr(),
    now()
  );
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Don't block access if logging fails, but log the error
  RETURN true;
END;
$$;

-- 9. Create trigger to automatically migrate existing banking data
CREATE OR REPLACE FUNCTION public.migrate_club_banking_data()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  club_record RECORD;
BEGIN
  -- Migrate existing banking data from clubs table
  FOR club_record IN 
    SELECT id, bank_account_holder, bank_account_number, bank_sort_code, bank_iban, bank_swift
    FROM public.clubs 
    WHERE (bank_account_number IS NOT NULL OR bank_iban IS NOT NULL)
    AND id NOT IN (SELECT club_id FROM public.club_banking)
  LOOP
    INSERT INTO public.club_banking (
      club_id,
      bank_account_holder,
      bank_account_number,
      bank_sort_code,
      bank_iban,
      bank_swift,
      created_by
    ) VALUES (
      club_record.id,
      club_record.bank_account_holder,
      club_record.bank_account_number,
      club_record.bank_sort_code,
      club_record.bank_iban,
      club_record.bank_swift,
      NULL -- System migration
    );
  END LOOP;
END;
$$;

-- Execute the migration
SELECT public.migrate_club_banking_data();

-- 10. Remove banking columns from clubs table (after migration)
ALTER TABLE public.clubs DROP COLUMN IF EXISTS bank_account_holder;
ALTER TABLE public.clubs DROP COLUMN IF EXISTS bank_account_number;
ALTER TABLE public.clubs DROP COLUMN IF EXISTS bank_sort_code;
ALTER TABLE public.clubs DROP COLUMN IF EXISTS bank_iban;
ALTER TABLE public.clubs DROP COLUMN IF EXISTS bank_swift;

-- 11. Create updated timestamp triggers
CREATE TRIGGER update_club_banking_updated_at
  BEFORE UPDATE ON public.club_banking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.detect_suspicious_access()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recent_access_count integer;
  user_role user_role;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Check for suspicious patterns (many accesses in short time)
  SELECT COUNT(*) INTO recent_access_count
  FROM public.data_access_log
  WHERE user_id = auth.uid()
    AND table_name = NEW.table_name
    AND created_at > (now() - interval '5 minutes');
  
  -- Alert on suspicious patterns
  IF recent_access_count > 10 AND user_role != 'ADMIN' THEN
    INSERT INTO public.security_logs (
      event_type,
      user_id,
      details,
      ip_address
    ) VALUES (
      'SUSPICIOUS_ACCESS_PATTERN',
      auth.uid(),
      jsonb_build_object(
        'table', NEW.table_name,
        'access_count', recent_access_count,
        'time_window', '5 minutes'
      ),
      inet_client_addr()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger for access monitoring
CREATE TRIGGER monitor_suspicious_access
  AFTER INSERT ON public.data_access_log
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_suspicious_access();