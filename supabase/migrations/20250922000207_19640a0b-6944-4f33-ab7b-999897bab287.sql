-- Create site_settings table for persistent application settings
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'Official Hole in 1',
  site_description TEXT DEFAULT 'Professional golf hole-in-one competitions',
  support_email TEXT DEFAULT 'support@holein1.com',
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT DEFAULT 'We are currently performing scheduled maintenance. Please check back soon.',
  max_competitions_per_club INTEGER DEFAULT 10,
  max_entry_fee_pounds INTEGER DEFAULT 500,
  stripe_connected BOOLEAN DEFAULT false,
  email_notifications_enabled BOOLEAN DEFAULT true,
  two_factor_required BOOLEAN DEFAULT false,
  password_min_length INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage site settings
CREATE POLICY "Only admins can manage site settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'ADMIN')
WITH CHECK (public.get_current_user_role() = 'ADMIN');

-- Create function to get current site settings
CREATE OR REPLACE FUNCTION public.get_site_settings()
RETURNS public.site_settings
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.site_settings ORDER BY created_at DESC LIMIT 1;
$$;

-- Create function to update site settings (upsert pattern)
CREATE OR REPLACE FUNCTION public.update_site_settings(
  p_site_name TEXT DEFAULT NULL,
  p_site_description TEXT DEFAULT NULL,
  p_support_email TEXT DEFAULT NULL,
  p_maintenance_mode BOOLEAN DEFAULT NULL,
  p_maintenance_message TEXT DEFAULT NULL,
  p_max_competitions_per_club INTEGER DEFAULT NULL,
  p_max_entry_fee_pounds INTEGER DEFAULT NULL,
  p_stripe_connected BOOLEAN DEFAULT NULL,
  p_email_notifications_enabled BOOLEAN DEFAULT NULL,
  p_two_factor_required BOOLEAN DEFAULT NULL,
  p_password_min_length INTEGER DEFAULT NULL
)
RETURNS public.site_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_settings public.site_settings;
BEGIN
  -- Check admin permissions
  IF public.get_current_user_role() != 'ADMIN' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Insert or update settings (there should only be one row)
  INSERT INTO public.site_settings (
    site_name,
    site_description, 
    support_email,
    maintenance_mode,
    maintenance_message,
    max_competitions_per_club,
    max_entry_fee_pounds,
    stripe_connected,
    email_notifications_enabled,
    two_factor_required,
    password_min_length,
    updated_at
  ) VALUES (
    COALESCE(p_site_name, 'Official Hole in 1'),
    COALESCE(p_site_description, 'Professional golf hole-in-one competitions'),
    COALESCE(p_support_email, 'support@holein1.com'),
    COALESCE(p_maintenance_mode, false),
    COALESCE(p_maintenance_message, 'We are currently performing scheduled maintenance. Please check back soon.'),
    COALESCE(p_max_competitions_per_club, 10),
    COALESCE(p_max_entry_fee_pounds, 500),
    COALESCE(p_stripe_connected, false),
    COALESCE(p_email_notifications_enabled, true),
    COALESCE(p_two_factor_required, false),
    COALESCE(p_password_min_length, 8),
    now()
  )
  ON CONFLICT ((true)) DO UPDATE SET
    site_name = COALESCE(p_site_name, EXCLUDED.site_name),
    site_description = COALESCE(p_site_description, EXCLUDED.site_description),
    support_email = COALESCE(p_support_email, EXCLUDED.support_email),
    maintenance_mode = COALESCE(p_maintenance_mode, EXCLUDED.maintenance_mode),
    maintenance_message = COALESCE(p_maintenance_message, EXCLUDED.maintenance_message),
    max_competitions_per_club = COALESCE(p_max_competitions_per_club, EXCLUDED.max_competitions_per_club),
    max_entry_fee_pounds = COALESCE(p_max_entry_fee_pounds, EXCLUDED.max_entry_fee_pounds),
    stripe_connected = COALESCE(p_stripe_connected, EXCLUDED.stripe_connected),
    email_notifications_enabled = COALESCE(p_email_notifications_enabled, EXCLUDED.email_notifications_enabled),
    two_factor_required = COALESCE(p_two_factor_required, EXCLUDED.two_factor_required),
    password_min_length = COALESCE(p_password_min_length, EXCLUDED.password_min_length),
    updated_at = now()
  RETURNING *;
  
  GET DIAGNOSTICS result_settings = ROW_COUNT;
  SELECT * INTO result_settings FROM public.site_settings ORDER BY updated_at DESC LIMIT 1;
  
  RETURN result_settings;
END;
$$;

-- Insert default settings
INSERT INTO public.site_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();