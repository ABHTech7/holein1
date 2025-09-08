-- Add comprehensive input validation functions to the database

-- Function to clean and validate text input
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

-- Enhanced profile validation trigger
CREATE OR REPLACE FUNCTION public.validate_profile_data_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format (enhanced)
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
    IF NOT NEW.email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
  END IF;
  
  -- Validate and clean names
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name := validate_text_input(NEW.first_name, 50);
    -- Additional name-specific validation
    IF NEW.first_name !~ '^[a-zA-ZÀ-ÿ\s\-''\.]+$' THEN
      RAISE EXCEPTION 'First name contains invalid characters';
    END IF;
  END IF;
  
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name := validate_text_input(NEW.last_name, 50);
    -- Additional name-specific validation
    IF NEW.last_name !~ '^[a-zA-ZÀ-ÿ\s\-''\.]+$' THEN
      RAISE EXCEPTION 'Last name contains invalid characters';
    END IF;
  END IF;
  
  -- Validate phone (enhanced)
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := TRIM(NEW.phone);
    IF NEW.phone != '' AND NOT NEW.phone ~ '^[\+\-\s\(\)\d]+$' THEN
      RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
  END IF;
  
  -- Validate phone_e164
  IF NEW.phone_e164 IS NOT NULL THEN
    NEW.phone_e164 := TRIM(NEW.phone_e164);
    IF NEW.phone_e164 != '' AND NOT NEW.phone_e164 ~ '^[\+\-\s\(\)\d]+$' THEN
      RAISE EXCEPTION 'Invalid phone_e164 format: %', NEW.phone_e164;
    END IF;
  END IF;
  
  -- Validate numeric fields
  IF NEW.age_years IS NOT NULL THEN
    IF NEW.age_years < 16 OR NEW.age_years > 120 THEN
      RAISE EXCEPTION 'Age must be between 16 and 120';
    END IF;
  END IF;
  
  IF NEW.handicap IS NOT NULL THEN
    IF NEW.handicap < -10 OR NEW.handicap > 54 THEN
      RAISE EXCEPTION 'Handicap must be between -10 and 54';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Replace the old validation trigger
DROP TRIGGER IF EXISTS validate_profile_data_trigger ON public.profiles;
CREATE TRIGGER validate_profile_data_enhanced_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_data_enhanced();

-- Club validation enhancement
CREATE OR REPLACE FUNCTION public.validate_club_data_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate club name
  IF NEW.name IS NOT NULL THEN
    NEW.name := validate_text_input(NEW.name, 100);
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
    NEW.address := validate_text_input(NEW.address, 500);
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
$$;

-- Replace the old club validation trigger
DROP TRIGGER IF EXISTS validate_club_data_trigger ON public.clubs;
CREATE TRIGGER validate_club_data_enhanced_trigger
  BEFORE INSERT OR UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_club_data_enhanced();

-- Add validation for competition data
CREATE OR REPLACE FUNCTION public.validate_competition_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate competition name
  IF NEW.name IS NOT NULL THEN
    NEW.name := validate_text_input(NEW.name, 200);
    IF LENGTH(TRIM(NEW.name)) < 3 THEN
      RAISE EXCEPTION 'Competition name must be at least 3 characters long';
    END IF;
  END IF;
  
  -- Validate description
  IF NEW.description IS NOT NULL THEN
    NEW.description := validate_text_input(NEW.description, 2000);
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
$$;

-- Create competition validation trigger
CREATE TRIGGER validate_competition_data_trigger
  BEFORE INSERT OR UPDATE ON public.competitions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_competition_data();