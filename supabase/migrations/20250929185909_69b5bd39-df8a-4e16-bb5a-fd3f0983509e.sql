-- Drop all versions of get_safe_competition_data to resolve overloading
DROP FUNCTION IF EXISTS public.get_safe_competition_data(uuid, text);
DROP FUNCTION IF EXISTS public.get_safe_competition_data(text, text);

-- Create single clean version
CREATE OR REPLACE FUNCTION public.get_safe_competition_data(
  p_club_id text DEFAULT NULL,
  p_competition_slug text DEFAULT NULL
)
RETURNS TABLE (
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
  club_website text,
  club_logo_url text,
  club_address text,
  club_email text,
  club_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
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
    cl.website as club_website,
    cl.logo_url as club_logo_url,
    cl.address as club_address,
    cl.email as club_email,
    cl.phone as club_phone
  FROM public.competitions c
  INNER JOIN public.clubs cl ON c.club_id = cl.id
  WHERE c.status IN ('ACTIVE', 'SCHEDULED')
    AND c.archived = false
    AND cl.active = true
    AND cl.archived = false
    AND (p_club_id IS NULL OR cl.id = p_club_id::uuid)
    AND (p_competition_slug IS NULL OR p_competition_slug = '' OR c.slug = p_competition_slug)
  ORDER BY c.start_date, c.name;
$$;

COMMENT ON FUNCTION public.get_safe_competition_data(text, text) IS 'Returns safe competition data for entry forms - no demo filtering';