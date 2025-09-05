-- Create storage bucket for club contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('club-contracts', 'club-contracts', false);

-- Create RLS policies for club contracts
CREATE POLICY "Admins can view all contracts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'club-contracts' AND auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Admins can upload contracts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'club-contracts' AND auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Admins can update contracts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'club-contracts' AND auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Admins can delete contracts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'club-contracts' AND auth.jwt() ->> 'role' = 'authenticated');