-- Add INSURANCE_PARTNER role to user_role enum
ALTER TYPE public.user_role ADD VALUE 'INSURANCE_PARTNER';

-- Create insurance_companies table
CREATE TABLE public.insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  contract_url TEXT,
  contact_email TEXT NOT NULL,
  premium_rate_per_entry DECIMAL(10,2) DEFAULT 1.00,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create insurance_users table for multiple logins per company
CREATE TABLE public.insurance_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_company_id UUID REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(insurance_company_id, user_id)
);

-- Create insurance_premiums table for monthly calculations
CREATE TABLE public.insurance_premiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_company_id UUID REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_entries INTEGER DEFAULT 0,
  premium_rate DECIMAL(10,2) NOT NULL,
  total_premium_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  generated_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  UNIQUE(insurance_company_id, period_start, period_end)
);

-- Add insurance settings to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN insurance_premium_rate DECIMAL(10,2) DEFAULT 1.00,
ADD COLUMN insurance_enabled BOOLEAN DEFAULT false;

-- Insert insurance-specific permissions
INSERT INTO public.admin_permissions (name, description, category) VALUES
('manage_insurance', 'Manage insurance companies and premiums', 'insurance'),
('view_insurance_data', 'View insurance premium data and reports', 'insurance');

-- Enable RLS on new tables
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_users ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.insurance_premiums ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insurance_companies
CREATE POLICY "admin_manage_insurance_companies" ON public.insurance_companies 
FOR ALL TO authenticated 
USING (get_current_user_is_admin())
WITH CHECK (get_current_user_is_admin());

-- RLS Policies for insurance_users
CREATE POLICY "admin_manage_insurance_users" ON public.insurance_users 
FOR ALL TO authenticated 
USING (get_current_user_is_admin())
WITH CHECK (get_current_user_is_admin());

CREATE POLICY "insurance_users_view_own" ON public.insurance_users 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- RLS Policies for insurance_premiums
CREATE POLICY "admin_manage_insurance_premiums" ON public.insurance_premiums 
FOR ALL TO authenticated 
USING (get_current_user_is_admin())
WITH CHECK (get_current_user_is_admin());

CREATE POLICY "insurance_users_view_company_premiums" ON public.insurance_premiums 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.insurance_users iu 
    WHERE iu.user_id = auth.uid() 
    AND iu.insurance_company_id = insurance_premiums.insurance_company_id
    AND iu.active = true
  )
);

-- Create function to get insurance-safe entry data
CREATE OR REPLACE FUNCTION public.get_insurance_entries_data(
  company_id UUID DEFAULT NULL,
  month_start DATE DEFAULT NULL,
  month_end DATE DEFAULT NULL
)
RETURNS TABLE(
  competition_id UUID,
  entry_date TIMESTAMPTZ,
  player_first_name TEXT,
  player_last_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has insurance access
  IF NOT (
    get_current_user_is_admin() OR
    (get_current_user_role() = 'INSURANCE_PARTNER' AND 
     EXISTS (
       SELECT 1 FROM insurance_users iu 
       WHERE iu.user_id = auth.uid() 
       AND (company_id IS NULL OR iu.insurance_company_id = company_id)
       AND iu.active = true
     ))
  ) THEN
    RAISE EXCEPTION 'Access denied to insurance data';
  END IF;

  RETURN QUERY
  SELECT 
    e.competition_id,
    e.entry_date AT TIME ZONE 'UTC' as entry_date,
    p.first_name as player_first_name,
    p.last_name as player_last_name
  FROM entries e
  JOIN profiles p ON e.player_id = p.id
  WHERE 
    (month_start IS NULL OR DATE(e.entry_date) >= month_start) AND
    (month_end IS NULL OR DATE(e.entry_date) <= month_end)
  ORDER BY e.entry_date DESC;
END;
$$;

-- Create function to calculate monthly premiums
CREATE OR REPLACE FUNCTION public.calculate_monthly_premiums(
  company_id UUID,
  period_start DATE,
  period_end DATE
)
RETURNS TABLE(
  entry_count INTEGER,
  premium_rate DECIMAL,
  total_premium DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rate DECIMAL(10,2);
  count INTEGER;
BEGIN
  -- Check admin access
  IF NOT get_current_user_is_admin() THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  -- Get premium rate for the company
  SELECT ic.premium_rate_per_entry INTO rate
  FROM insurance_companies ic
  WHERE ic.id = company_id AND ic.active = true;

  IF rate IS NULL THEN
    RAISE EXCEPTION 'Insurance company not found or inactive';
  END IF;

  -- Count entries in the period
  SELECT COUNT(*) INTO count
  FROM entries e
  WHERE DATE(e.entry_date) >= period_start
    AND DATE(e.entry_date) <= period_end;

  RETURN QUERY SELECT count, rate, (count * rate);
END;
$$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_insurance_companies_updated_at
  BEFORE UPDATE ON public.insurance_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_insurance_users_user_id ON public.insurance_users(user_id);
CREATE INDEX idx_insurance_users_company_id ON public.insurance_users(insurance_company_id);
CREATE INDEX idx_insurance_premiums_company_period ON public.insurance_premiums(insurance_company_id, period_start, period_end);
CREATE INDEX idx_entries_date ON public.entries(entry_date);