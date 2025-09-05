-- Create storage bucket for club logos
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true);

-- Create RLS policies for club logos bucket
CREATE POLICY "Club logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'club-logos');

CREATE POLICY "Authenticated users can upload club logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update club logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete club logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'club-logos' AND auth.role() = 'authenticated');