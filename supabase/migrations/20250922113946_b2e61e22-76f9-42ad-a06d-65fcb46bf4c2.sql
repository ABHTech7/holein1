-- Phase 1: Add SUPER_ADMIN to user_role enum
ALTER TYPE public.user_role ADD VALUE 'SUPER_ADMIN';

-- Create admin_permissions table with predefined permission types
CREATE TABLE public.admin_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert predefined permissions
INSERT INTO public.admin_permissions (name, description, category) VALUES
  ('manage_users', 'Create, edit, and manage user accounts', 'user_management'),
  ('manage_clubs', 'Create, edit, and manage club accounts', 'club_management'), 
  ('manage_competitions', 'Create, edit, and manage competitions', 'competition_management'),
  ('view_revenue', 'Access revenue reports and financial data', 'financial'),
  ('manage_claims', 'Process and verify win claims', 'claims_management'),
  ('manage_entries', 'View and manage competition entries', 'entry_management'),
  ('system_settings', 'Modify system-wide settings and configuration', 'system'),
  ('view_analytics', 'Access system analytics and reports', 'analytics'),
  ('manage_audit', 'View and manage audit logs', 'security'),
  ('manage_staff', 'Create and manage staff/admin users', 'user_management');

-- Create admin_user_permissions junction table
CREATE TABLE public.admin_user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

-- Enable RLS on new tables
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_permissions (read-only for admins)
CREATE POLICY "Admins can view permissions" ON public.admin_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- RLS policies for admin_user_permissions
CREATE POLICY "Super admins can manage all user permissions" ON public.admin_user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Admins can view their own permissions" ON public.admin_user_permissions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

-- Create function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    LEFT JOIN public.admin_user_permissions aup ON p.id = aup.user_id
    LEFT JOIN public.admin_permissions ap ON aup.permission_id = ap.id
    WHERE p.id = user_uuid
    AND (
      p.role = 'SUPER_ADMIN' OR
      (p.role = 'ADMIN' AND ap.name = permission_name)
    )
  );
$$;

-- Create function to get current user permissions
CREATE OR REPLACE FUNCTION public.get_current_user_permissions()
RETURNS TABLE(permission_name text, permission_description text, category text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ap.name,
    ap.description,
    ap.category
  FROM public.profiles p
  LEFT JOIN public.admin_user_permissions aup ON p.id = aup.user_id
  LEFT JOIN public.admin_permissions ap ON aup.permission_id = ap.id
  WHERE p.id = auth.uid()
  AND p.role IN ('ADMIN', 'SUPER_ADMIN')
  UNION
  -- Super admins have all permissions
  SELECT 
    ap.name,
    ap.description,
    ap.category
  FROM public.admin_permissions ap
  WHERE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

-- Update existing ADMIN users to SUPER_ADMIN
UPDATE public.profiles 
SET role = 'SUPER_ADMIN'
WHERE role = 'ADMIN';

-- Update role matrix functions to include SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;