-- Fix database functions that lack explicit search_path for security
-- This prevents potential search_path injection attacks

-- Update functions that currently don't have explicit search_path
CREATE OR REPLACE FUNCTION public.validate_text_input(input_text text, max_length integer DEFAULT 255)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update the update_updated_at_column function to include search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id uuid DEFAULT auth.uid(),
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet DEFAULT inet_client_addr()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    validate_text_input(event_type, 100),
    user_id,
    ip_address,
    details,
    validate_text_input(current_setting('request.headers', true)::json->>'user-agent', 500),
    now()
  );
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Don't block operations if security logging fails
  RETURN false;
END;
$$;

-- Add function to validate and sanitize uploaded file metadata
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  original_filename text,
  mime_type text,
  file_size_bytes integer,
  upload_purpose text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  PERFORM log_security_event(
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
$$;