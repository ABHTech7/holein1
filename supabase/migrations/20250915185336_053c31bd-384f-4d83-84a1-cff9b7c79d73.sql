-- Add missing critical index for policy performance
CREATE INDEX IF NOT EXISTS idx_verifications_entry_id ON public.verifications(entry_id);

-- Drop existing policies to replace with granular ones
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.verifications;
DROP POLICY IF EXISTS "Club members can view verifications for their competitions" ON public.verifications;
DROP POLICY IF EXISTS "Players can view their own verifications" ON public.verifications;
DROP POLICY IF EXISTS "Players can create verifications for their entries" ON public.verifications;
DROP POLICY IF EXISTS "Admins and clubs can update verifications" ON public.verifications;

-- 1) SELECT Policies
CREATE POLICY verif_admin_select
  ON public.verifications
  FOR SELECT
  USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY verif_club_select
  ON public.verifications
  FOR SELECT
  USING (
    get_current_user_role() = 'CLUB'::user_role
    AND EXISTS (
      SELECT 1
      FROM public.entries e
      JOIN public.competitions c ON c.id = e.competition_id
      WHERE e.id = verifications.entry_id
        AND c.club_id = get_current_user_club_id()
    )
  );

CREATE POLICY verif_player_select
  ON public.verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.entries e
      WHERE e.id = verifications.entry_id
        AND e.player_id = auth.uid()
    )
  );

-- 2) INSERT Policy
CREATE POLICY verif_player_insert
  ON public.verifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.entries e
      WHERE e.id = verifications.entry_id
        AND e.player_id = auth.uid()
    )
  );

-- 3) UPDATE Policies (granular by role)
-- Players can update evidence fields only when status allows it
CREATE POLICY verif_player_update
  ON public.verifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.entries e
      WHERE e.id = verifications.entry_id
        AND e.player_id = auth.uid()
    )
  )
  WITH CHECK (verifications.status IN ('initiated','pending'));

-- Clubs can update status and manage their competition verifications
CREATE POLICY verif_club_update
  ON public.verifications
  FOR UPDATE
  USING (
    get_current_user_role() = 'CLUB'::user_role
    AND EXISTS (
      SELECT 1
      FROM public.entries e
      JOIN public.competitions c ON c.id = e.competition_id
      WHERE e.id = verifications.entry_id
        AND c.club_id = get_current_user_club_id()
    )
  )
  WITH CHECK (TRUE);

-- Admins can update anything
CREATE POLICY verif_admin_update
  ON public.verifications
  FOR UPDATE
  USING (get_current_user_role() = 'ADMIN'::user_role)
  WITH CHECK (TRUE);

-- 4) DELETE Policy (admins only)
CREATE POLICY verif_admin_delete
  ON public.verifications
  FOR DELETE
  USING (get_current_user_role() = 'ADMIN'::user_role);