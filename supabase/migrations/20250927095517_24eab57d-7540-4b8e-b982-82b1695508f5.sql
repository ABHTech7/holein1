-- Create missing database functions for safe data access

-- Function to get safe clubs data (public access)
CREATE OR REPLACE FUNCTION public.get_safe_clubs_data()
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  phone text,
  email text,
  website text,
  logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.address,
    c.phone,
    c.email,
    c.website,
    c.logo_url
  FROM public.clubs c
  WHERE c.active = true 
    AND c.archived = false
    AND COALESCE(c.is_demo_data, false) = false
  ORDER BY c.name;
$$;

-- Function to get safe competition data (public access)
CREATE OR REPLACE FUNCTION public.get_safe_competition_data(
  p_club_id text DEFAULT NULL,
  p_competition_slug text DEFAULT NULL
)
RETURNS TABLE (
  competition_id uuid,
  competition_name text,
  competition_description text,
  competition_status text,
  competition_start_date timestamptz,
  competition_end_date timestamptz,
  competition_entry_fee numeric,
  competition_hole_number integer,
  competition_slug text,
  club_id uuid,
  club_name text,
  club_address text,
  club_phone text,
  club_email text,
  club_website text,
  club_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    c.id as competition_id,
    c.name as competition_name,
    c.description as competition_description,
    c.status::text as competition_status,
    c.start_date as competition_start_date,
    c.end_date as competition_end_date,
    c.entry_fee as competition_entry_fee,
    c.hole_number as competition_hole_number,
    c.slug as competition_slug,
    cl.id as club_id,
    cl.name as club_name,
    cl.address as club_address,
    cl.phone as club_phone,
    cl.email as club_email,
    cl.website as club_website,
    cl.logo_url as club_logo_url
  FROM public.competitions c
  INNER JOIN public.clubs cl ON c.club_id = cl.id
  WHERE c.status IN ('ACTIVE', 'SCHEDULED')
    AND c.archived = false
    AND cl.active = true
    AND cl.archived = false
    AND COALESCE(c.is_demo_data, false) = false
    AND COALESCE(cl.is_demo_data, false) = false
    AND (p_club_id IS NULL OR cl.id = p_club_id::uuid)
    AND (p_competition_slug IS NULL OR p_competition_slug = '' OR c.slug = p_competition_slug)
  ORDER BY c.start_date, c.name;
$$;