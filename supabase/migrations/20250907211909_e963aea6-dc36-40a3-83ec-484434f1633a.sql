-- Create venues for all existing clubs/competitions
INSERT INTO public.venues (slug, name, club_id)
SELECT 
  LOWER(REPLACE(REPLACE(REPLACE(clubs.name, ' ', '-'), '''', ''), '&', 'and')) as slug,
  clubs.name,
  clubs.id
FROM public.clubs 
WHERE clubs.active = true AND clubs.archived = false
ON CONFLICT (slug) DO NOTHING;

-- Update any existing venues to ensure they're properly linked
UPDATE public.venues 
SET name = clubs.name
FROM public.clubs 
WHERE venues.club_id = clubs.id;