-- Phase 2: Fix database functions to remove demo data filtering

-- Drop and recreate get_safe_clubs_data without demo filtering
DROP FUNCTION IF EXISTS get_safe_clubs_data();

CREATE OR REPLACE FUNCTION get_safe_clubs_data()
RETURNS TABLE (
  id uuid,
  name text,
  website text,
  logo_url text,
  address text,
  email text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return all active, non-archived clubs with minimal safe fields
  SELECT 
    id,
    name,
    website,
    logo_url,
    address,
    email,
    phone
  FROM clubs
  WHERE active = true 
    AND archived = false
  ORDER BY name;
$$;

COMMENT ON FUNCTION get_safe_clubs_data() IS 'Returns minimal safe club data for public consumption - no demo filtering, only active/archived checks';
