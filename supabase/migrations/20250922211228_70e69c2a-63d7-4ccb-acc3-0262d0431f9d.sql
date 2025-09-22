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

-- Link the current insurance partner user to the existing active company
-- First, get the active company ID and link the user
DO $$
DECLARE
  active_company_id uuid;
  insurer_user_id uuid;
BEGIN
  -- Get the active insurance company
  SELECT id INTO active_company_id 
  FROM insurance_companies 
  WHERE active = true 
  LIMIT 1;
  
  -- Get the insurance partner user (assuming the user with INSURANCE_PARTNER role)
  SELECT id INTO insurer_user_id
  FROM profiles 
  WHERE role = 'INSURANCE_PARTNER' 
  LIMIT 1;
  
  -- Link them if both exist
  IF active_company_id IS NOT NULL AND insurer_user_id IS NOT NULL THEN
    INSERT INTO insurance_users (
      user_id,
      insurance_company_id,
      role,
      active
    ) VALUES (
      insurer_user_id,
      active_company_id,
      'admin',
      true
    ) ON CONFLICT (user_id, insurance_company_id) DO UPDATE SET
      active = true,
      role = 'admin';
  END IF;
END $$;