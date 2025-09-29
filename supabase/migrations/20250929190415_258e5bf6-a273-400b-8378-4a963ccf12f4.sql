-- 1) Create slugify function matching frontend logic
CREATE OR REPLACE FUNCTION public.slugify(text_input text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT 
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(trim(text_input)),
              '''', '', 'g'  -- Remove apostrophes
            ),
            '&', 'and', 'g'  -- Replace & with 'and'
          ),
          '[^a-z0-9]+', '-', 'g'  -- Replace non-alphanumeric with hyphens
        ),
        '^-+|-+$', '', 'g'  -- Remove leading/trailing hyphens
      ),
      '-{2,}', '-', 'g'  -- Collapse multiple hyphens
    );
$$;

COMMENT ON FUNCTION public.slugify(text) IS 'Generate URL-safe slug from text, matching frontend slugUtils.ts';

-- 2) Update get_safe_competition_data to match both slug and slugified name
DROP FUNCTION IF EXISTS public.get_safe_competition_data(text, text);

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
    AND (
      p_competition_slug IS NULL 
      OR p_competition_slug = '' 
      OR c.slug = p_competition_slug
      OR public.slugify(c.name) = p_competition_slug
    )
  ORDER BY c.start_date, c.name;
$$;

COMMENT ON FUNCTION public.get_safe_competition_data(text, text) IS 'Returns safe competition data - matches both stored slug and slugified name';

-- 3) Backfill competition slugs where NULL
DO $$
DECLARE
  comp RECORD;
  new_slug text;
  slug_count integer;
  suffix integer;
BEGIN
  FOR comp IN 
    SELECT id, name FROM public.competitions WHERE slug IS NULL
  LOOP
    new_slug := public.slugify(comp.name);
    suffix := 1;
    
    -- Check for duplicates and append suffix if needed
    LOOP
      SELECT COUNT(*) INTO slug_count 
      FROM public.competitions 
      WHERE slug = new_slug AND id != comp.id;
      
      EXIT WHEN slug_count = 0;
      
      suffix := suffix + 1;
      new_slug := public.slugify(comp.name) || '-' || suffix;
    END LOOP;
    
    UPDATE public.competitions 
    SET slug = new_slug, updated_at = now()
    WHERE id = comp.id;
  END LOOP;
END $$;

-- 4) Create trigger function to auto-generate slugs
CREATE OR REPLACE FUNCTION public.set_competition_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set slug if it's NULL or empty
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

-- 5) Create trigger on competitions table
DROP TRIGGER IF EXISTS competitions_set_slug ON public.competitions;

CREATE TRIGGER competitions_set_slug
  BEFORE INSERT OR UPDATE ON public.competitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_competition_slug();

COMMENT ON TRIGGER competitions_set_slug ON public.competitions IS 'Auto-generates slug from name if not provided';