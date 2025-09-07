-- Fix venue/club name synchronization by properly handling constraints

-- Add a temporary column for the new slugs
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS new_slug text;

-- Update the temporary column with correct slugs derived from club names
UPDATE public.venues 
SET 
  name = clubs.name,
  new_slug = LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REPLACE(
          REPLACE(clubs.name, '''', ''), 
          '&', 'and'
        ), 
        '[^a-z0-9]+', '-', 'g'
      ), 
      '^-+|-+$', '', 'g'
    )
  ),
  updated_at = now()
FROM public.clubs 
WHERE venues.club_id = clubs.id;

-- Handle duplicates by making them unique with venue ID suffix
UPDATE public.venues 
SET new_slug = new_slug || '-venue-' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE new_slug IN (
  SELECT new_slug 
  FROM public.venues 
  WHERE new_slug IS NOT NULL
  GROUP BY new_slug 
  HAVING count(*) > 1
);

-- Drop the unique constraint (not the index)
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_slug_key;

-- Update the actual slug column
UPDATE public.venues SET slug = new_slug WHERE new_slug IS NOT NULL;

-- Drop the temporary column
ALTER TABLE public.venues DROP COLUMN IF EXISTS new_slug;

-- Recreate the unique constraint
ALTER TABLE public.venues ADD CONSTRAINT venues_slug_key UNIQUE (slug);

-- Ensure the sync trigger is properly attached to clubs table
DROP TRIGGER IF EXISTS sync_venue_name_with_club_trigger ON public.clubs;
CREATE TRIGGER sync_venue_name_with_club_trigger
  AFTER UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_name_with_club();