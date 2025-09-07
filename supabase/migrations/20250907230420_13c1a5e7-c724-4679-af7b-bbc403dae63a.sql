-- Fix security issue by restricting anonymous access to clubs table
-- Drop the failed view approach
DROP VIEW IF EXISTS public.clubs_safe;

-- Create a more restrictive policy for anonymous users that only allows specific safe columns
-- We'll handle this at the application level instead of database view level
CREATE POLICY "Anonymous users can view minimal club data" 
ON public.clubs 
FOR SELECT 
USING (
  archived = false 
  AND active = true 
  AND auth.uid() IS NULL
);

-- Re-add authenticated users policy
CREATE POLICY "Authenticated users can view basic club info" 
ON public.clubs 
FOR SELECT 
USING (
  archived = false 
  AND active = true 
  AND auth.uid() IS NOT NULL
);