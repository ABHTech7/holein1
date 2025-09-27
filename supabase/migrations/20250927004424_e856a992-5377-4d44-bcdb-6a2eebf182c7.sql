-- Fix staging environment configuration by removing production domain references

-- Update is_production_environment function to never return true for staging
CREATE OR REPLACE FUNCTION public.is_production_environment()
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Always return false for staging environment
  -- This ensures all production-specific features are disabled
  RETURN false;
END;
$$;

-- Update site settings to use demo domain email addresses
UPDATE public.site_settings 
SET 
  support_email = 'support@demo.holein1challenge.co.uk',
  updated_at = now()
WHERE support_email = 'support@officialholein1.com';

-- Update insurance companies to use demo domain email addresses  
UPDATE public.insurance_companies
SET 
  contact_email = 'insurance@demo.holein1challenge.co.uk',
  updated_at = now()
WHERE contact_email = 'insurance@officialholein1.com';