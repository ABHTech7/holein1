-- Update insurance_companies to enforce only one active company
ALTER TABLE public.insurance_companies 
ADD CONSTRAINT only_one_active_company 
EXCLUDE (active WITH =) WHERE (active = true);

-- Add insurance settings to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN current_insurance_company_id uuid REFERENCES public.insurance_companies(id),
ADD COLUMN insurance_contact_name text,
ADD COLUMN insurance_contact_phone text;

-- Update insurance companies to have only one active
UPDATE public.insurance_companies 
SET active = false 
WHERE active = true AND id != (
  SELECT id FROM public.insurance_companies 
  WHERE active = true 
  LIMIT 1
);