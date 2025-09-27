-- Fix Critical Database Schema Issues

-- 1. Add slug columns to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS slug text;

-- 2. Add slug columns to competitions table  
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS slug text;

-- 3. Create unique indexes for slugs (after we populate them)
-- We'll do this after generating slugs

-- 4. Fix competition status enum to include both cases
ALTER TYPE competition_status ADD VALUE IF NOT EXISTS 'active';

-- 5. Create user_roles table as referenced in code
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Admins can manage all user roles" ON public.user_roles
FOR ALL USING (get_current_user_is_admin())
WITH CHECK (get_current_user_is_admin());

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- 6. Generate slugs for existing clubs using the createSlug logic
UPDATE public.clubs 
SET slug = lower(trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(name, '''', '', 'g'), 
      '&', 'and', 'g'
    ), 
    '[^a-z0-9]+', 
    '-', 
    'g'
  )
))
WHERE slug IS NULL AND name IS NOT NULL;

-- 7. Generate slugs for existing competitions using the createSlug logic
UPDATE public.competitions 
SET slug = lower(trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(name, '''', '', 'g'), 
      '&', 'and', 'g'
    ), 
    '[^a-z0-9]+', 
    '-', 
    'g'
  )
))
WHERE slug IS NULL AND name IS NOT NULL;

-- 8. Remove leading/trailing hyphens from generated slugs
UPDATE public.clubs 
SET slug = trim(both '-' from slug)
WHERE slug IS NOT NULL;

UPDATE public.competitions 
SET slug = trim(both '-' from slug)
WHERE slug IS NOT NULL;

-- 9. Handle duplicate slugs by appending numbers
WITH numbered_clubs AS (
  SELECT id, slug, 
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM public.clubs 
  WHERE slug IS NOT NULL
)
UPDATE public.clubs 
SET slug = CASE 
  WHEN numbered_clubs.rn = 1 THEN numbered_clubs.slug
  ELSE numbered_clubs.slug || '-' || numbered_clubs.rn
END
FROM numbered_clubs 
WHERE clubs.id = numbered_clubs.id AND numbered_clubs.rn > 1;

WITH numbered_competitions AS (
  SELECT id, slug,
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM public.competitions 
  WHERE slug IS NOT NULL
)
UPDATE public.competitions 
SET slug = CASE 
  WHEN numbered_competitions.rn = 1 THEN numbered_competitions.slug
  ELSE numbered_competitions.slug || '-' || numbered_competitions.rn
END
FROM numbered_competitions 
WHERE competitions.id = numbered_competitions.id AND numbered_competitions.rn > 1;

-- 10. Create unique constraints on slugs
ALTER TABLE public.clubs ADD CONSTRAINT clubs_slug_unique UNIQUE (slug);
ALTER TABLE public.competitions ADD CONSTRAINT competitions_slug_unique UNIQUE (slug);

-- 11. Migrate existing profile roles to user_roles table
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
SELECT id, role, created_at, updated_at 
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 12. Create function to keep user_roles in sync with profiles
CREATE OR REPLACE FUNCTION sync_profile_role_to_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle role changes
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Remove old role
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = OLD.role;
    -- Add new role
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, NEW.role) 
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Handle new profiles  
  IF TG_OP = 'INSERT' AND NEW.role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, NEW.role) 
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync roles
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON public.profiles;
CREATE TRIGGER sync_profile_role_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_role_to_user_roles();