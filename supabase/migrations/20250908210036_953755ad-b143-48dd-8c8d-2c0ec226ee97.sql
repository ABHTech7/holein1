-- Fix RLS policy for magic_link_tokens to allow service role access
DROP POLICY IF EXISTS "Magic link tokens completely inaccessible" ON magic_link_tokens;

-- Create a new policy that allows service role access while still blocking client access
CREATE POLICY "Service role can access magic link tokens" 
ON magic_link_tokens 
FOR ALL 
USING (auth.role() = 'service_role');

-- Also allow authenticated access for the edge function context
CREATE POLICY "System can access magic link tokens" 
ON magic_link_tokens 
FOR ALL 
USING (auth.uid() IS NULL OR auth.role() = 'service_role');