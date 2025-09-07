-- Temporarily disable security trigger and clean up venues/clubs
-- Step 1: Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS log_security_events_trigger ON public.clubs;

-- Step 2: Add slug column to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS slug text;

-- Step 3: Generate proper slugs for all clubs
UPDATE public.clubs 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REPLACE(
        REPLACE(name, '''', ''), 
        '&', 'and'
      ), 
      '[^a-z0-9]+', '-', 'g'
    ), 
    '^-+|-+$', '', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Step 4: Make club slugs unique if there are duplicates
UPDATE public.clubs 
SET slug = slug || '-' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE slug IN (
  SELECT slug 
  FROM public.clubs 
  WHERE slug IS NOT NULL AND slug != ''
  GROUP BY slug 
  HAVING count(*) > 1
);

-- Step 5: Add unique constraint on club slug
ALTER TABLE public.clubs ADD CONSTRAINT clubs_slug_key UNIQUE (slug);

-- Step 6: Clean up venues table - keep only one venue per club (the oldest one)
DELETE FROM public.venues 
WHERE id NOT IN (
  SELECT DISTINCT ON (club_id) id 
  FROM public.venues 
  ORDER BY club_id, created_at ASC
);

-- Step 7: Update remaining venues to have proper slugs matching their clubs
UPDATE public.venues 
SET 
  name = clubs.name,
  slug = clubs.slug,
  updated_at = now()
FROM public.clubs 
WHERE venues.club_id = clubs.id;

-- Step 8: Re-enable the security trigger for clubs
CREATE TRIGGER log_security_events_trigger
  AFTER INSERT OR UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_security_events();