-- Fix venue/club name synchronization by handling duplicates carefully

-- First, let's temporarily disable the unique constraint by dropping and recreating the venues table structure
-- We'll do this by creating a new column, updating it, then swapping

-- Add a temporary column for the new slugs
ALTER TABLE public.venues ADD COLUMN new_slug text;

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

-- Handle potential duplicates by adding a suffix
UPDATE public.venues 
SET new_slug = new_slug || '-' || id::text
WHERE new_slug IN (
  SELECT new_slug 
  FROM public.venues 
  WHERE new_slug IS NOT NULL
  GROUP BY new_slug 
  HAVING count(*) > 1
);

-- Drop the unique constraint on the old slug column
DROP INDEX IF EXISTS venues_slug_key;

-- Update the actual slug column
UPDATE public.venues SET slug = new_slug WHERE new_slug IS NOT NULL;

-- Drop the temporary column
ALTER TABLE public.venues DROP COLUMN new_slug;

-- Recreate the unique constraint
CREATE UNIQUE INDEX venues_slug_key ON public.venues(slug);

-- Ensure the sync trigger is properly attached to clubs table
DROP TRIGGER IF EXISTS sync_venue_name_with_club_trigger ON public.clubs;
CREATE TRIGGER sync_venue_name_with_club_trigger
  AFTER UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_name_with_club();