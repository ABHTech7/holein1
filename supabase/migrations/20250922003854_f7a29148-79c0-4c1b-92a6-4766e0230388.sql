-- Add admin policy to allow admins to create verification records for any entry
CREATE POLICY "verif_admin_insert" 
ON public.verifications 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);