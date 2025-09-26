-- Create new RPC functions for public data with robust demo filtering

-- Function to get public clubs data with demo filtering
CREATE OR REPLACE FUNCTION public.get_public_clubs_data(include_demo boolean DEFAULT false)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  address text,
  website text,
  logo_url text,
  active boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.website,
    c.logo_url,
    c.active,
    c.created_at
  FROM public.clubs c
  WHERE c.active = true
    AND c.archived = false
    AND (
      include_demo = true OR 
      (
        COALESCE(c.is_demo_data, false) = false
        AND NOT (c.name ILIKE '%demo%')
        AND NOT (c.email ILIKE '%@demo-golf-club.test%')
        AND NOT (c.email ILIKE '%@holein1demo.test%')
        AND NOT (c.email ILIKE '%@holein1.test%')
        AND NOT (c.email ILIKE '%demo%')
      )
    )
  ORDER BY c.created_at DESC;
END;
$$;

-- Function to get public competition data with demo filtering
CREATE OR REPLACE FUNCTION public.get_public_competition_data(
  p_club_id uuid DEFAULT NULL,
  p_competition_slug text DEFAULT NULL,
  include_demo boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  club_id uuid,
  club_name text,
  club_slug text,
  slug text,
  hole_number integer,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  status competition_status,
  entry_fee numeric,
  prize_pool numeric,
  hero_image_url text,
  is_year_round boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.club_id,
    cl.name as club_name,
    LOWER(REPLACE(cl.name, ' ', '-')) as club_slug,
    LOWER(REPLACE(c.name, ' ', '-')) as slug,
    c.hole_number,
    c.start_date,
    c.end_date,
    c.status,
    c.entry_fee,
    c.prize_pool,
    c.hero_image_url,
    c.is_year_round
  FROM public.competitions c
  JOIN public.clubs cl ON cl.id = c.club_id
  WHERE c.status = 'ACTIVE'::competition_status
    AND c.archived = false
    AND cl.active = true
    AND cl.archived = false
    AND (p_club_id IS NULL OR c.club_id = p_club_id)
    AND (p_competition_slug IS NULL OR LOWER(REPLACE(c.name, ' ', '-')) = p_competition_slug)
    AND (
      include_demo = true OR 
      (
        -- Filter out demo competitions
        COALESCE(c.is_demo_data, false) = false
        AND NOT (c.name ILIKE '%demo%')
        AND NOT (c.description ILIKE '%demo%')
        -- Filter out competitions from demo clubs
        AND COALESCE(cl.is_demo_data, false) = false
        AND NOT (cl.name ILIKE '%demo%')
        AND NOT (cl.email ILIKE '%@demo-golf-club.test%')
        AND NOT (cl.email ILIKE '%@holein1demo.test%')
        AND NOT (cl.email ILIKE '%@holein1.test%')
        AND NOT (cl.email ILIKE '%demo%')
      )
    )
  ORDER BY c.start_date ASC;
END;
$$;