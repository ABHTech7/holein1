-- Allow anonymous users to create lead records for partnership applications
CREATE POLICY "Anonymous users can create partnership leads" 
ON public.leads 
FOR INSERT 
TO anon 
WITH CHECK (source = 'Partnership Application');