-- Update the trigger function to also update venue slug
CREATE OR REPLACE FUNCTION public.sync_venue_name_with_club()
RETURNS TRIGGER AS $$
DECLARE
    new_slug text;
BEGIN
  -- Create slug from club name
  new_slug := LOWER(NEW.name);
  new_slug := REPLACE(new_slug, '''', '');
  new_slug := REPLACE(new_slug, '&', 'and');
  new_slug := REGEXP_REPLACE(new_slug, '[^a-z0-9]+', '-', 'g');
  new_slug := REGEXP_REPLACE(new_slug, '^-+|-+$', '', 'g');
  
  -- Update all venues for this club to match the new club name and slug
  UPDATE public.venues 
  SET 
    name = NEW.name,
    slug = new_slug,
    updated_at = now()
  WHERE club_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;