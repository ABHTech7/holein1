-- Enhanced RLS policies for verifications table to support email-based auth
-- Drop existing player policies
DROP POLICY IF EXISTS "verif_player_insert" ON public.verifications;
DROP POLICY IF EXISTS "player_select_verifications" ON public.verifications;
DROP POLICY IF EXISTS "verif_player_update" ON public.verifications;

-- Create enhanced policies that support both user_id and email-based auth
CREATE POLICY "verif_player_insert_enhanced" 
ON public.verifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = verifications.entry_id
    AND (
      e.player_id = auth.uid()
      OR lower(e.email) = lower((auth.jwt() ->> 'email'))
    )
  )
);

CREATE POLICY "player_select_verifications_enhanced"
ON public.verifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = verifications.entry_id
    AND (
      e.player_id = auth.uid()
      OR lower(e.email) = lower((auth.jwt() ->> 'email'))
    )
  )
);

CREATE POLICY "verif_player_update_enhanced"
ON public.verifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = verifications.entry_id
    AND (
      e.player_id = auth.uid()
      OR lower(e.email) = lower((auth.jwt() ->> 'email'))
    )
  )
)
WITH CHECK (
  status IN ('initiated', 'pending', 'submitted')
);

-- Enhanced RLS policies for claims table
DROP POLICY IF EXISTS "Players can create claims for their entries" ON public.claims;
DROP POLICY IF EXISTS "Players can view their own claims" ON public.claims;

CREATE POLICY "players_create_claims_enhanced"
ON public.claims
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = claims.entry_id
    AND (
      e.player_id = auth.uid()
      OR lower(e.email) = lower((auth.jwt() ->> 'email'))
    )
  )
);

CREATE POLICY "players_view_claims_enhanced"
ON public.claims
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = claims.entry_id
    AND (
      e.player_id = auth.uid()
      OR lower(e.email) = lower((auth.jwt() ->> 'email'))
    )
  )
);