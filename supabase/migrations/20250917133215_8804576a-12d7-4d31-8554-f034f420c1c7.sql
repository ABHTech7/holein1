-- Continue fixing remaining functions with search path issues

BEGIN;

-- Fix remaining functions that need search_path = ''

CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text, record_id uuid, access_type text, sensitive_fields text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Update access tracking for banking table
  IF table_name = 'club_banking' THEN
    UPDATE public.club_banking 
    SET 
      last_accessed_at = now(),
      access_count = access_count + 1
    WHERE id = record_id;
  END IF;
  
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
  -- Don't block access if logging fails
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.migrate_club_banking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  club_record RECORD;
BEGIN
  FOR club_record IN 
    SELECT id, bank_account_holder, bank_account_number, bank_sort_code, bank_iban, bank_swift
    FROM public.clubs 
    WHERE (bank_account_number IS NOT NULL OR bank_iban IS NOT NULL)
    AND id NOT IN (SELECT club_id FROM public.club_banking WHERE club_id IS NOT NULL)
  LOOP
    INSERT INTO public.club_banking (
      club_id,
      bank_account_holder,
      bank_account_number,
      bank_sort_code,
      bank_iban,
      bank_swift
    ) VALUES (
      club_record.id,
      club_record.bank_account_holder,
      club_record.bank_account_number,
      club_record.bank_sort_code,
      club_record.bank_iban,
      club_record.bank_swift
    ) ON CONFLICT (club_id) DO NOTHING;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_admin_self_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Prevent users from inserting themselves as ADMIN
  IF NEW.role = 'ADMIN' AND auth.uid() = NEW.id THEN
    -- Allow only if there are no existing admins (initial setup)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'ADMIN') THEN
      RAISE EXCEPTION 'Cannot self-assign ADMIN role. Admin creation must be done through secure channels.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Prevent regular users from changing their own role to ADMIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow role changes by other admins or system (auth.uid() is null for system operations)
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
      RAISE EXCEPTION 'Users cannot change their own role. Contact an administrator.';
    END IF;
    
    -- Log role changes in audit events
    INSERT INTO public.audit_events (
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      user_id,
      ip_address
    ) VALUES (
      'role_change',
      NEW.id,
      'UPDATE',
      jsonb_build_object('old_role', OLD.role, 'user_email', OLD.email),
      jsonb_build_object('new_role', NEW.role, 'user_email', NEW.email),
      auth.uid(),
      inet_client_addr()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_venue_name_with_club()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    new_slug text;
BEGIN
  -- Create slug from club name
  new_slug := LOWER(NEW.name);
  new_slug := REPLACE(new_slug, '''', '');
  new_slug := REPLACE(new_slug, '&', 'and');
  new_slug := REGEXP_REPLACE(new_slug, '[^a-z0-9]+', '-', 'g');
  new_slug := REGEXP_REPLACE(new_slug, '^-+|-+$', '', 'g');
  
  -- Update all venues for this club to match the new club name and slug
  UPDATE public.venues 
  SET 
    name = NEW.name,
    slug = new_slug,
    updated_at = now()
  WHERE club_id = NEW.id;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_club_banking_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_expired_entries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  updated_count integer := 0;
  legacy_count integer := 0;
BEGIN
  -- Update entries that have passed their attempt window and haven't reported an outcome
  UPDATE public.entries 
  SET 
    outcome_self = 'auto_miss',
    outcome_reported_at = now(),
    status = 'expired',
    updated_at = now()
  WHERE 
    attempt_window_end IS NOT NULL 
    AND attempt_window_end < now()
    AND outcome_self IS NULL;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Handle legacy entries without attempt windows (older than 5 hours)
  UPDATE public.entries 
  SET 
    outcome_self = 'auto_miss',
    outcome_reported_at = now(),
    status = 'expired',
    updated_at = now()
  WHERE 
    attempt_window_end IS NULL 
    AND entry_date < (now() - interval '5 hours')
    AND outcome_self IS NULL
    AND status = 'pending';
    
  GET DIAGNOSTICS legacy_count = ROW_COUNT;
  updated_count := updated_count + legacy_count;
  
  RETURN updated_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_profile_safe(
  user_id UUID,
  profile_email TEXT,
  profile_first_name TEXT DEFAULT NULL,
  profile_last_name TEXT DEFAULT NULL,
  profile_phone TEXT DEFAULT NULL,
  profile_phone_e164 TEXT DEFAULT NULL,
  profile_role public.user_role DEFAULT 'PLAYER'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.validate_club_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Validate email format if provided
  IF NEW.email IS NOT NULL AND NOT public.is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Validate phone if provided
  IF NOT public.is_valid_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Basic validation for club name
  IF NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) < 2 THEN
    RAISE EXCEPTION 'Club name must be at least 2 characters long';
  END IF;
  
  -- Prevent potentially malicious content in club name
  IF NEW.name ~* '<[^>]*>' OR NEW.name ~* 'script' THEN
    RAISE EXCEPTION 'Invalid characters in club name';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_club_data_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Validate club name
  IF NEW.name IS NOT NULL THEN
    NEW.name := public.validate_text_input(NEW.name, 100);
    IF LENGTH(TRIM(NEW.name)) < 2 THEN
      RAISE EXCEPTION 'Club name must be at least 2 characters long';
    END IF;
  END IF;
  
  -- Validate email if provided
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
    IF NEW.email != '' AND NOT NEW.email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
  END IF;
  
  -- Validate phone
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := TRIM(NEW.phone);
    IF NEW.phone != '' AND NOT NEW.phone ~ '^[\+\-\s\(\)\d]+$' THEN
      RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
  END IF;
  
  -- Validate address
  IF NEW.address IS NOT NULL THEN
    NEW.address := public.validate_text_input(NEW.address, 500);
  END IF;
  
  -- Validate website URL
  IF NEW.website IS NOT NULL THEN
    NEW.website := TRIM(NEW.website);
    IF NEW.website != '' AND NOT NEW.website ~* '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
      RAISE EXCEPTION 'Invalid website URL format';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_competition_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Validate competition name
  IF NEW.name IS NOT NULL THEN
    NEW.name := public.validate_text_input(NEW.name, 200);
    IF LENGTH(TRIM(NEW.name)) < 3 THEN
      RAISE EXCEPTION 'Competition name must be at least 3 characters long';
    END IF;
  END IF;
  
  -- Validate description
  IF NEW.description IS NOT NULL THEN
    NEW.description := public.validate_text_input(NEW.description, 2000);
  END IF;
  
  -- Validate numeric fields
  IF NEW.entry_fee IS NOT NULL AND NEW.entry_fee < 0 THEN
    RAISE EXCEPTION 'Entry fee cannot be negative';
  END IF;
  
  IF NEW.prize_pool IS NOT NULL AND NEW.prize_pool < 0 THEN
    RAISE EXCEPTION 'Prize pool cannot be negative';
  END IF;
  
  IF NEW.hole_number IS NOT NULL THEN
    IF NEW.hole_number < 1 OR NEW.hole_number > 18 THEN
      RAISE EXCEPTION 'Hole number must be between 1 and 18';
    END IF;
  END IF;
  
  -- Validate dates
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    IF NOT NEW.is_year_round AND NEW.end_date <= NEW.start_date THEN
      RAISE EXCEPTION 'End date must be after start date for non-year-round competitions';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_file_upload(original_filename text, mime_type text, file_size_bytes integer, upload_purpose text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  max_file_size integer := 20971520; -- 20MB
  allowed_purposes text[] := ARRAY['selfie', 'id_document', 'handicap_proof', 'shot_video', 'club_logo', 'competition_hero'];
BEGIN
  -- Validate filename
  IF original_filename IS NULL OR LENGTH(TRIM(original_filename)) = 0 THEN
    RAISE EXCEPTION 'Filename cannot be empty';
  END IF;
  
  -- Check for dangerous file extensions
  IF original_filename ~* '\.(exe|bat|cmd|scr|pif|com|jar|js|vbs|ps1|sh)$' THEN
    RAISE EXCEPTION 'File type not allowed for security reasons';
  END IF;
  
  -- Validate file size
  IF file_size_bytes > max_file_size THEN
    RAISE EXCEPTION 'File size exceeds maximum limit of 20MB';
  END IF;
  
  -- Validate upload purpose
  IF NOT (upload_purpose = ANY(allowed_purposes)) THEN
    RAISE EXCEPTION 'Invalid upload purpose';
  END IF;
  
  -- Log file upload attempt
  PERFORM public.log_security_event(
    'FILE_UPLOAD_VALIDATION',
    auth.uid(),
    jsonb_build_object(
      'filename', original_filename,
      'mime_type', mime_type,
      'size_bytes', file_size_bytes,
      'purpose', upload_purpose
    )
  );
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Validate email format
  IF NOT public.is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  -- Validate phone if provided
  IF NOT public.is_valid_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
  END IF;
  
  -- Ensure names don't contain potentially malicious content
  IF NEW.first_name IS NOT NULL AND (NEW.first_name ~* '<[^>]*>' OR NEW.first_name ~* 'script') THEN
    RAISE EXCEPTION 'Invalid characters in first name';
  END IF;
  
  IF NEW.last_name IS NOT NULL AND (NEW.last_name ~* '<[^>]*>' OR NEW.last_name ~* 'script') THEN
    RAISE EXCEPTION 'Invalid characters in last name';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_text_input(input_text text, max_length integer DEFAULT 255)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Handle null input
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Trim whitespace
  input_text := TRIM(input_text);
  
  -- Check for potentially dangerous patterns
  IF input_text ~* '(<script|<iframe|<object|<embed|javascript:|vbscript:|data:text/html)' THEN
    RAISE EXCEPTION 'Input contains potentially harmful content';
  END IF;
  
  -- Check for SQL injection patterns
  IF input_text ~* '(union|select|insert|update|delete|drop|create|alter)\s+' OR
     input_text ~ '(--|/\*|\*/|;)' THEN
    RAISE EXCEPTION 'Input contains potentially harmful SQL patterns';
  END IF;
  
  -- Limit length
  IF LENGTH(input_text) > max_length THEN
    input_text := SUBSTRING(input_text FROM 1 FOR max_length);
  END IF;
  
  RETURN input_text;
END;
$function$;

COMMIT;