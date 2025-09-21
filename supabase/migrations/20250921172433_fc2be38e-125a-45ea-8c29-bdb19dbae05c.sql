-- Update RLS policy to allow both anonymous and authenticated users to submit partnership applications
DROP POLICY IF EXISTS "Anonymous users can create partnership leads" ON public.leads;

-- Create new policy that explicitly allows both anon and authenticated users
CREATE POLICY "Allow partnership application submissions"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (source = 'Partnership Application'::text);