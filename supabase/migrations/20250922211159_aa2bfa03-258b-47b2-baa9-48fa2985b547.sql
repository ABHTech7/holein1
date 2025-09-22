-- Add RLS policy for insurance partners to read insurance companies
CREATE POLICY "insurance_partners_view_companies" 
ON insurance_companies 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM insurance_users iu 
    WHERE iu.user_id = auth.uid() 
    AND iu.insurance_company_id = insurance_companies.id
    AND iu.active = true
  )
);

-- Ensure we have the Lockton insurance company data
INSERT INTO insurance_companies (
  id,
  name,
  contact_email,
  premium_rate_per_entry,
  active
) VALUES (
  '8a8c4f8c-4c4d-4c4d-8a8c-4f8c4c4d4c4d',
  'Lockton',
  'claims@lockton.com',
  1.50,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  contact_email = EXCLUDED.contact_email,
  premium_rate_per_entry = EXCLUDED.premium_rate_per_entry,
  active = EXCLUDED.active;