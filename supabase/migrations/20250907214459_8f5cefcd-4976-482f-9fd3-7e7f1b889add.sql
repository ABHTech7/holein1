-- Create trigger to automatically update venue names when club names change
CREATE OR REPLACE FUNCTION public.sync_venue_name_with_club()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all venues for this club to match the new club name
  UPDATE public.venues 
  SET name = NEW.name, updated_at = now()
  WHERE club_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger that runs after club name updates
CREATE TRIGGER sync_venue_name_on_club_update
  AFTER UPDATE OF name ON public.clubs
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION public.sync_venue_name_with_club();