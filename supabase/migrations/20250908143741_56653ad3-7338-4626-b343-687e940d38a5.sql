-- Fix critical privilege escalation vulnerability
-- Users should not be able to update their own role field

-- First, create a secure function for admin-only role changes
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role user_role
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if current user is ADMIN
  IF get_current_user_role() != 'ADMIN'::user_role THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  -- Update the user's role
  UPDATE public.profiles 
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the role change for security audit
  INSERT INTO public.audit_events (
    entity_type,
    entity_id,
    action,
    old_values,
    new_values,
    user_id
  ) VALUES (
    'role_change',
    target_user_id,
    'ADMIN_UPDATE',
    jsonb_build_object('changed_by', auth.uid()),
    jsonb_build_object('new_role', new_role),
    auth.uid()
  );
  
  RETURN TRUE;
END;
$$;

-- Create a new restrictive policy for profile updates that excludes role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- New policy: Users can update their profile EXCEPT the role field
CREATE POLICY "Users can update their own profile except role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Ensure role hasn't changed, or if it has, user must be admin
    OLD.role = NEW.role 
    OR get_current_user_role() = 'ADMIN'::user_role
  )
);

-- Keep admin policy for full profile management
-- (This should already exist but let's ensure it's there)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'ADMIN'::user_role);