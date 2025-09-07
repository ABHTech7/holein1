-- Add hero image URL column to competitions table
ALTER TABLE public.competitions 
ADD COLUMN hero_image_url TEXT;

-- Create storage bucket for competition hero images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('competition-heroes', 'competition-heroes', true);

-- Create storage policies for competition hero images
CREATE POLICY "Competition hero images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'competition-heroes');

CREATE POLICY "Admins can upload competition hero images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'competition-heroes' AND 
  get_current_user_role() = 'ADMIN'::user_role
);

CREATE POLICY "Club members can upload hero images for their competitions" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'competition-heroes' AND 
  get_current_user_role() = 'CLUB'::user_role
);

CREATE POLICY "Admins can update competition hero images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'competition-heroes' AND 
  get_current_user_role() = 'ADMIN'::user_role
);

CREATE POLICY "Club members can update hero images for their competitions" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'competition-heroes' AND 
  get_current_user_role() = 'CLUB'::user_role
);

CREATE POLICY "Admins can delete competition hero images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'competition-heroes' AND 
  get_current_user_role() = 'ADMIN'::user_role
);

CREATE POLICY "Club members can delete hero images for their competitions" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'competition-heroes' AND 
  get_current_user_role() = 'CLUB'::user_role
);