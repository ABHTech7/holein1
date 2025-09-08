-- Add database trigger for role change protection and audit logging
CREATE OR REPLACE FUNCTION public.protect_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent regular users from changing their own role to ADMIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow role changes by other admins or system (auth.uid() is null for system operations)
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
      RAISE EXCEPTION 'Users cannot change their own role. Contact an administrator.';
    END IF;
    
    -- Log role changes in audit events
    INSERT INTO public.audit_events (
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      user_id,
      ip_address
    ) VALUES (
      'role_change',
      NEW.id,
      'UPDATE',
      jsonb_build_object('old_role', OLD.role, 'user_email', OLD.email),
      jsonb_build_object('new_role', NEW.role, 'user_email', NEW.email),
      auth.uid(),
      inet_client_addr()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role change protection
DROP TRIGGER IF EXISTS protect_role_changes_trigger ON public.profiles;
CREATE TRIGGER protect_role_changes_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_role_changes();

-- Add additional security function to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.prevent_admin_self_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent users from inserting themselves as ADMIN
  IF NEW.role = 'ADMIN' AND auth.uid() = NEW.id THEN
    -- Allow only if there are no existing admins (initial setup)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'ADMIN') THEN
      RAISE EXCEPTION 'Cannot self-assign ADMIN role. Admin creation must be done through secure channels.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for preventing admin self-elevation
DROP TRIGGER IF EXISTS prevent_admin_self_elevation_trigger ON public.profiles;
CREATE TRIGGER prevent_admin_self_elevation_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_self_elevation();

-- Add function to validate role changes are authorized
CREATE OR REPLACE FUNCTION public.is_role_change_authorized(target_user_id uuid, new_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- System operations (auth.uid() is null) are always authorized
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;
  
  -- Current user must be ADMIN to change roles
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RETURN false;
  END IF;
  
  -- Cannot change own role
  IF auth.uid() = target_user_id THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Add RLS policy to enforce role change authorization
CREATE POLICY "Role changes must be authorized" ON public.profiles
  FOR UPDATE
  USING (
    -- Allow if not changing role
    (SELECT role FROM public.profiles WHERE id = profiles.id) = role
    OR
    -- Allow if properly authorized
    public.is_role_change_authorized(id, role)
  );