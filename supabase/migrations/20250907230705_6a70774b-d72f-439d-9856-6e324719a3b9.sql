-- Final comprehensive security lockdown
-- Remove ALL anonymous/public access to sensitive tables

-- Lock down clubs table completely for anonymous users
DROP POLICY IF EXISTS "Anonymous users can view active clubs for public view" ON public.clubs;
DROP POLICY IF EXISTS "Public can view basic club info" ON public.clubs;

-- Lock down venues table for anonymous users  
DROP POLICY IF EXISTS "Everyone can view venues" ON public.venues;

-- Create restricted venue policy
CREATE POLICY "Authenticated users can view venues" 
ON public.venues 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Lock down competitions table for anonymous users
DROP POLICY IF EXISTS "Everyone can view active competitions" ON public.competitions;

-- Create restricted competition policy  
CREATE POLICY "Authenticated users can view competitions" 
ON public.competitions 
FOR SELECT 
USING (
  archived = false 
  AND auth.uid() IS NOT NULL
);

-- Add security comments
COMMENT ON POLICY "Authenticated users can view venues" ON public.venues IS 'Security: Prevents anonymous access to venue data';
COMMENT ON POLICY "Authenticated users can view competitions" ON public.competitions IS 'Security: Prevents anonymous access to competition financial data';

-- Create a public-safe clubs view that applications can use
CREATE OR REPLACE FUNCTION public.get_safe_clubs_data()
RETURNS TABLE (
  id uuid,
  name text,
  website text,
  logo_url text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    id,
    name,
    website,
    logo_url,
    created_at
  FROM public.clubs 
  WHERE archived = false AND active = true;
$$;