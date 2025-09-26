-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_safe_clubs_data();
DROP FUNCTION IF EXISTS public.get_safe_competition_data(uuid, text);

-- Recreate get_safe_clubs_data to exclude demo data
CREATE OR REPLACE FUNCTION public.get_safe_clubs_data()
RETURNS TABLE(
  id uuid,
  name text,
  address text,
  phone text,
  email text,
  website text,
  logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
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
    AND COALESCE(c.is_demo_data, false) = false;
END;
$$;

-- Recreate get_safe_competition_data to exclude demo data
CREATE OR REPLACE FUNCTION public.get_safe_competition_data(p_club_id uuid DEFAULT NULL, p_competition_slug text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  entry_fee numeric,
  prize_pool numeric,
  hole_number integer,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_year_round boolean,
  hero_image_url text,
  club_id uuid,
  club_name text,
  club_address text,
  club_phone text,
  club_email text,
  club_website text,
  club_logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.entry_fee,
    c.prize_pool,
    c.hole_number,
    c.start_date,
    c.end_date,
    c.is_year_round,
    c.hero_image_url,
    cl.id as club_id,
    cl.name as club_name,
    cl.address as club_address,
    cl.phone as club_phone,
    cl.email as club_email,
    cl.website as club_website,
    cl.logo_url as club_logo_url
  FROM public.competitions c
  JOIN public.clubs cl ON c.club_id = cl.id
  WHERE c.status = 'ACTIVE'
    AND c.archived = false
    AND cl.active = true
    AND cl.archived = false
    AND COALESCE(c.is_demo_data, false) = false
    AND COALESCE(cl.is_demo_data, false) = false
    AND (p_club_id IS NULL OR cl.id = p_club_id)
    AND (p_competition_slug IS NULL OR LOWER(REPLACE(c.name, ' ', '-')) = LOWER(p_competition_slug));
END;
$$;