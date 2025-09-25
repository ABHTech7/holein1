-- Storage policies to allow admins (including SUPER_ADMIN) to manage competition-heroes uploads

CREATE POLICY "admin_insert_competition_heroes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'competition-heroes' AND public.get_current_user_is_admin()
);

CREATE POLICY "admin_update_competition_heroes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'competition-heroes' AND public.get_current_user_is_admin()
)
WITH CHECK (
  bucket_id = 'competition-heroes' AND public.get_current_user_is_admin()
);

CREATE POLICY "admin_delete_competition_heroes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'competition-heroes' AND public.get_current_user_is_admin()
);