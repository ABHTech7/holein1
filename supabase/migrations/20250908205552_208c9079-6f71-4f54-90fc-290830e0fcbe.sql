-- Create video evidence storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('shot-videos', 'shot-videos', false);

-- Create storage policies for shot videos
CREATE POLICY "Users can upload their shot videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'shot-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own shot videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shot-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Club members can view shot videos for their competitions" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shot-videos' AND 
  EXISTS (
    SELECT 1 FROM entries e
    JOIN competitions c ON e.competition_id = c.id
    WHERE e.player_id::text = (storage.foldername(name))[1]
    AND c.club_id = get_current_user_club_id()
    AND get_current_user_role() = 'CLUB'::user_role
  )
);

CREATE POLICY "Admins can view all shot videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'shot-videos' AND get_current_user_role() = 'ADMIN'::user_role);

-- Add video_evidence_url column to entries table for storing shot videos
ALTER TABLE entries ADD COLUMN video_evidence_url text;