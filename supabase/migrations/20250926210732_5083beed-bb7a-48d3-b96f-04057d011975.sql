-- Update is_production_environment function to allow testing in specific cases
CREATE OR REPLACE FUNCTION public.is_production_environment()
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_host text;
  demo_config jsonb;
BEGIN
  -- Get the current host
  BEGIN
    current_host := current_setting('request.headers', true)::json->>'host';
  EXCEPTION WHEN OTHERS THEN
    current_host := '';
  END;
  
  -- True production domains
  IF current_host LIKE 'officialholein1.com' 
     OR current_host LIKE '%.officialholein1.com' THEN
    RETURN true;
  END IF;
  
  -- Allow Lovable environments when explicitly configured for production testing
  -- This allows testing the production flush feature in development
  IF current_host LIKE '%.lovableproject.com' THEN
    -- Check if there's a way to determine if this is meant to be a production-like test
    -- For now, allow it if the user is a SUPER_ADMIN (they know what they're doing)
    RETURN EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    );
  END IF;
  
  -- Default to production for unknown domains (safety)
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  -- If we can't determine, assume production for safety
  RETURN true;
END;
$$;