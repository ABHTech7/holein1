-- Fix the get_safe_competition_data function to properly filter by competition slug
CREATE OR REPLACE FUNCTION public.get_safe_competition_data(club_uuid uuid, competition_slug_param text)
RETURNS TABLE(id uuid, name text, description text, entry_fee numeric, prize_pool numeric, hole_number integer, status competition_status, start_date timestamp with time zone, end_date timestamp with time zone, is_year_round boolean, hero_image_url text, club_id uuid, club_name text, club_website text, club_logo_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Return basic competition information for public access
  -- Filter by competition slug if provided
  SELECT 
    c.id,
    c.name,
    c.description,
    c.entry_fee,
    c.prize_pool,
    c.hole_number,
    c.status,
    c.start_date,
    c.end_date,
    c.is_year_round,
    c.hero_image_url,
    c.club_id,
    cl.name as club_name,
    cl.website as club_website,
    cl.logo_url as club_logo_url
  FROM public.competitions c
  JOIN public.clubs cl ON c.club_id = cl.id
  WHERE c.club_id = club_uuid
    AND c.archived = false
    AND cl.archived = false 
    AND cl.active = true
    AND c.status IN ('ACTIVE', 'SCHEDULED')
    AND (
      competition_slug_param = '' OR 
      competition_slug_param IS NULL OR
      -- Match competition slug using the same logic as createSlug
      LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REPLACE(REPLACE(c.name, '''', ''), '&', 'and'), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))) = competition_slug_param
    );
$function$