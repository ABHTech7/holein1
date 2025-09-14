-- Migration 003: Storage Buckets & Policies

-- Create new private storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('player-selfies', 'player-selfies', false),
  ('id-documents', 'id-documents', false),
  ('handicap-proofs', 'handicap-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for player-selfies bucket
CREATE POLICY "Users can upload their own selfies" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'player-selfies' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own selfies" ON storage.objects  
FOR SELECT USING (
  bucket_id = 'player-selfies' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own selfies" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'player-selfies' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own selfies" ON storage.objects
FOR DELETE USING (
  bucket_id = 'player-selfies' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all selfies" ON storage.objects
FOR ALL USING (
  bucket_id = 'player-selfies' AND
  get_current_user_role() = 'ADMIN'
);

-- Storage policies for id-documents bucket
CREATE POLICY "Users can upload their own ID documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'id-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own ID documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'id-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own ID documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'id-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own ID documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'id-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all ID documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'id-documents' AND
  get_current_user_role() = 'ADMIN'
);

-- Storage policies for handicap-proofs bucket
CREATE POLICY "Users can upload their own handicap proofs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'handicap-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own handicap proofs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'handicap-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own handicap proofs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'handicap-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own handicap proofs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'handicap-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all handicap proofs" ON storage.objects
FOR ALL USING (
  bucket_id = 'handicap-proofs' AND
  get_current_user_role() = 'ADMIN'
);