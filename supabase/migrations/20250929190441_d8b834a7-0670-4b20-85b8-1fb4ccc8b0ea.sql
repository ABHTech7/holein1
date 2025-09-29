-- Fix search_path for slugify function
CREATE OR REPLACE FUNCTION public.slugify(text_input text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Fix search_path for set_competition_slug function
CREATE OR REPLACE FUNCTION public.set_competition_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set slug if it's NULL or empty
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;