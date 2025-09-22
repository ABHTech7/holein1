-- Add helper function and update RLS policies to include SUPER_ADMIN as admin
-- This ensures SUPER_ADMIN has the same access as ADMIN across admin-managed resources

-- 1) Helper function to centralize admin check
CREATE OR REPLACE FUNCTION public.get_current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_current_user_role() IN ('ADMIN'::public.user_role, 'SUPER_ADMIN'::public.user_role)
$$;

-- 2) Update policies on key tables used by the admin dashboard

-- clubs
ALTER POLICY admin_select_all_clubs ON public.clubs
USING (public.get_current_user_is_admin());

ALTER POLICY admin_update_clubs ON public.clubs
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

ALTER POLICY admin_insert_clubs ON public.clubs
WITH CHECK (public.get_current_user_is_admin());

ALTER POLICY admin_delete_clubs ON public.clubs
USING (public.get_current_user_is_admin());

-- competitions
ALTER POLICY admin_select_competitions ON public.competitions
USING (public.get_current_user_is_admin());

ALTER POLICY admin_update_competitions ON public.competitions
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

ALTER POLICY admin_insert_competitions ON public.competitions
WITH CHECK (public.get_current_user_is_admin());

ALTER POLICY admin_delete_competitions ON public.competitions
USING (public.get_current_user_is_admin());

-- entries
ALTER POLICY admin_select_entries ON public.entries
USING (public.get_current_user_is_admin());

-- profiles
ALTER POLICY admin_select_profiles ON public.profiles
USING (public.get_current_user_is_admin());

ALTER POLICY admin_update_any_profile ON public.profiles
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- claims
ALTER POLICY "Admins can manage all claims" ON public.claims
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- verifications
ALTER POLICY admin_select_verifications ON public.verifications
USING (public.get_current_user_is_admin());

ALTER POLICY verif_admin_delete ON public.verifications
USING (public.get_current_user_is_admin());

ALTER POLICY verif_admin_insert ON public.verifications
WITH CHECK (public.get_current_user_is_admin());

ALTER POLICY verif_admin_update ON public.verifications
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- leads
ALTER POLICY "Admins can view all leads" ON public.leads
USING (public.get_current_user_is_admin());

ALTER POLICY admin_read_leads ON public.leads
USING (public.get_current_user_is_admin());

ALTER POLICY admin_update_leads ON public.leads
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- site_settings
ALTER POLICY "Only admins can manage site settings" ON public.site_settings
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- data_access_log
ALTER POLICY "Admins can view access logs" ON public.data_access_log
USING (public.get_current_user_is_admin());

-- security_logs
ALTER POLICY "Admin access to security logs" ON public.security_logs
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- club_payments
ALTER POLICY "Admins can manage all payments" ON public.club_payments
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- uploaded_files
ALTER POLICY "Admins can manage all files" ON public.uploaded_files
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- staff_codes
ALTER POLICY "Admins can manage all staff codes" ON public.staff_codes
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- staff
ALTER POLICY "Admins can manage all staff" ON public.staff
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- venues
ALTER POLICY "Admins can manage venues" ON public.venues
USING (public.get_current_user_is_admin())
WITH CHECK (public.get_current_user_is_admin());

-- notes (preserve existing manual-only constraint for delete)
ALTER POLICY "Admins can view all notes" ON public.notes
USING (public.get_current_user_is_admin());

ALTER POLICY "Admins can delete manual notes" ON public.notes
USING (public.get_current_user_is_admin() AND note_type = 'manual');