-- Temporarily disable the venue sync trigger
DROP TRIGGER IF EXISTS sync_venue_name_with_club ON public.clubs;

-- Fix the venue slug duplication issue
WITH duplicates AS (
  SELECT slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn, id
  FROM public.venues 
  WHERE slug IN (
    SELECT slug 
    FROM public.venues 
    GROUP BY slug 
    HAVING COUNT(*) > 1
  )
)
UPDATE public.venues 
SET slug = slug || '-' || substring(id::text, 1, 8)
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Fix existing clubs without contracts to be inactive
UPDATE public.clubs 
SET active = false, updated_at = now()
WHERE contract_signed = false 
  AND contract_url IS NULL 
  AND active = true;

-- Create function to enforce contract requirement for activation
CREATE OR REPLACE FUNCTION public.enforce_club_contract_requirement()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only allow activation if contract is signed OR contract is uploaded
  IF NEW.active = true AND (NEW.contract_signed = false AND NEW.contract_url IS NULL) THEN
    RAISE EXCEPTION 'Club cannot be activated without a signed contract or uploaded contract document';
  END IF;
  
  -- Auto-deactivate if contract is removed and not manually signed
  IF TG_OP = 'UPDATE' AND OLD.contract_url IS NOT NULL AND NEW.contract_url IS NULL AND NEW.contract_signed = false THEN
    NEW.active = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on clubs table for contract enforcement
DROP TRIGGER IF EXISTS enforce_contract_requirement ON public.clubs;
CREATE TRIGGER enforce_contract_requirement
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_club_contract_requirement();

-- Re-enable the venue sync trigger with improved logic
CREATE OR REPLACE FUNCTION public.sync_venue_name_with_club()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    new_slug text;
    slug_counter integer := 1;
    final_slug text;
BEGIN
  -- Create base slug from club name
  new_slug := LOWER(NEW.name);
  new_slug := REPLACE(new_slug, '''', '');
  new_slug := REPLACE(new_slug, '&', 'and');
  new_slug := REGEXP_REPLACE(new_slug, '[^a-z0-9]+', '-', 'g');
  new_slug := REGEXP_REPLACE(new_slug, '^-+|-+$', '', 'g');
  
  -- Ensure uniqueness by appending counter if needed
  final_slug := new_slug;
  WHILE EXISTS (SELECT 1 FROM public.venues WHERE slug = final_slug AND club_id != NEW.id) LOOP
    final_slug := new_slug || '-' || slug_counter;
    slug_counter := slug_counter + 1;
  END LOOP;
  
  -- Update all venues for this club to match the new club name and unique slug
  UPDATE public.venues 
  SET 
    name = NEW.name,
    slug = final_slug,
    updated_at = now()
  WHERE club_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Re-create the venue sync trigger
CREATE TRIGGER sync_venue_name_with_club
  AFTER UPDATE ON public.clubs
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION public.sync_venue_name_with_club();