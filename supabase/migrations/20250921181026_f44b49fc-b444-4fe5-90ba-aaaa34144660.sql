-- Fix the RLS policy for partnership application submissions
-- The current policy might not be working properly for anonymous users
DROP POLICY IF EXISTS "Allow partnership application submissions" ON public.leads;

-- Create a more explicit policy that allows anonymous users to insert partnership applications
CREATE POLICY "Allow anonymous partnership submissions"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (source = 'Partnership Application');

-- Also ensure authenticated users can still submit partnership applications  
CREATE POLICY "Allow authenticated partnership submissions"
ON public.leads
FOR INSERT  
TO authenticated
WITH CHECK (source = 'Partnership Application');