-- Fix venue/club name synchronization issue
-- The venues table has stale slugs that don't match the current club names

-- Update all venues to sync with their club names and generate correct slugs
UPDATE public.venues 
SET 
  name = clubs.name,
  slug = LOWER(
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

-- Ensure the sync trigger is properly attached to clubs table
DROP TRIGGER IF EXISTS sync_venue_name_with_club_trigger ON public.clubs;
CREATE TRIGGER sync_venue_name_with_club_trigger
  AFTER UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_name_with_club();