-- Fix function search path security issue
-- Set search_path = '' for all functions as recommended by security linter

BEGIN;

-- Fix all functions to use empty search_path for security
-- This ensures all references are fully qualified and prevents security issues

CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.check_entry_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- Check if there's a recent entry within 12 hours for the same player and competition
    IF EXISTS (
        SELECT 1 FROM public.entries 
        WHERE player_id = NEW.player_id 
        AND competition_id = NEW.competition_id 
        AND entry_date > (NEW.entry_date - INTERVAL '12 hours')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Players must wait 12 hours between entries for the same competition';
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.detect_suspicious_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  recent_access_count integer;
  user_role_val public.user_role;
BEGIN
  SELECT role INTO user_role_val FROM public.profiles WHERE id = auth.uid();
  
  SELECT COUNT(*) INTO recent_access_count
  FROM public.data_access_log
  WHERE user_id = auth.uid()
    AND table_name = NEW.table_name
    AND created_at > (now() - interval '5 minutes');
  
  IF recent_access_count > 10 AND user_role_val != 'ADMIN' THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.get_competition_status(start_date timestamp with time zone, end_date timestamp with time zone, is_year_round boolean)
RETURNS public.competition_status
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF is_year_round THEN
    -- Year-round competitions are ACTIVE if start date has passed
    IF start_date <= NOW() THEN
      RETURN 'ACTIVE'::public.competition_status;
    ELSE
      RETURN 'SCHEDULED'::public.competition_status;
    END IF;
  ELSE
    -- Regular competitions with end dates
    IF end_date IS NULL THEN
      -- If no end date but not marked as year-round, treat as ended
      RETURN 'ENDED'::public.competition_status;
    ELSIF NOW() < start_date THEN
      RETURN 'SCHEDULED'::public.competition_status;
    ELSIF NOW() >= start_date AND NOW() <= end_date THEN
      RETURN 'ACTIVE'::public.competition_status;
    ELSE
      RETURN 'ENDED'::public.competition_status;
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_club_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT club_id FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_profile_safe()
RETURNS TABLE(id uuid, email text, first_name text, last_name text, role public.user_role, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.created_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_safe_club_info(club_uuid uuid)
RETURNS TABLE(id uuid, name text, website text, logo_url text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_safe_clubs_data()
RETURNS TABLE(id uuid, name text, website text, logo_url text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.get_safe_competition_data(club_uuid uuid, competition_slug_param text)
RETURNS TABLE(id uuid, name text, description text, entry_fee numeric, prize_pool numeric, hole_number integer, status public.competition_status, start_date timestamp with time zone, end_date timestamp with time zone, is_year_round boolean, hero_image_url text, club_id uuid, club_name text, club_website text, club_logo_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  -- Return basic competition information for public access
  -- Filter by competition slug if provided using exact JavaScript slug logic
  SELECT 
    c.id,
    c.name,
    c.description,
    c.entry_fee,
    c.prize_pool,
    c.hole_number,
    c.status,
    c.start_date,
    c.end_date,
    c.is_year_round,
    c.hero_image_url,
    c.club_id,
    cl.name as club_name,
    cl.website as club_website,
    cl.logo_url as club_logo_url
  FROM public.competitions c
  JOIN public.clubs cl ON c.club_id = cl.id
  WHERE c.club_id = club_uuid
    AND c.archived = false
    AND cl.archived = false 
    AND cl.active = true
    AND c.status IN ('ACTIVE', 'SCHEDULED')
    AND (
      competition_slug_param = '' OR 
      competition_slug_param IS NULL OR
      -- Match competition slug using exact JavaScript createSlug logic
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REPLACE(
            REPLACE(
              LOWER(TRIM(c.name)), 
              '''', ''
            ), 
            '&', 'and'
          ), 
          '[^a-z0-9]+', '-', 'g'
        ), 
        '^-+|-+$', '', 'g'
      ) = competition_slug_param
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role_safe(user_uuid uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT role FROM public.profiles WHERE id = user_uuid LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    -- Enhanced name extraction from OAuth providers
    COALESCE(
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'given_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'family_name',
      NEW.raw_user_meta_data ->> 'surname'
    ),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'PLAYER')
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_role_change_authorized(target_user_id uuid, new_role public.user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- System operations (auth.uid() is null) are always authorized
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;
  
  -- Current user must be ADMIN to change roles
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RETURN false;
  END IF;
  
  -- Cannot change own role
  IF auth.uid() = target_user_id THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Continue with remaining functions...

CREATE OR REPLACE FUNCTION public.is_valid_email(email_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN email_text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_valid_phone(phone_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Allow null/empty phones
  IF phone_text IS NULL OR phone_text = '' THEN
    RETURN true;
  END IF;
  
  -- Basic phone validation - allow digits, spaces, dashes, parentheses, plus
  RETURN phone_text ~* '^[\+]?[0-9\s\-\(\)]{7,20}$';
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id uuid DEFAULT auth.uid(), details jsonb DEFAULT '{}'::jsonb, ip_address inet DEFAULT inet_client_addr())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Insert security event with enhanced validation
  INSERT INTO public.security_logs (
    event_type,
    user_id,
    ip_address,
    details,
    user_agent,
    created_at
  ) VALUES (
    public.validate_text_input(event_type, 100),
    user_id,
    ip_address,
    details,
    public.validate_text_input(current_setting('request.headers', true)::json->>'user-agent', 500),
    now()
  );
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Don't block operations if security logging fails
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

COMMIT;