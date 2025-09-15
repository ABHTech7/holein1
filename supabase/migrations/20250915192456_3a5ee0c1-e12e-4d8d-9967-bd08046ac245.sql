-- Step 1: Create audit trigger function for club_banking
CREATE OR REPLACE FUNCTION public.touch_club_banking_audit()
RETURNS trigger AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Add audit trigger to club_banking table
DROP TRIGGER IF EXISTS trigger_club_banking_audit ON public.club_banking;
CREATE TRIGGER trigger_club_banking_audit
  BEFORE INSERT OR UPDATE ON public.club_banking
  FOR EACH ROW EXECUTE FUNCTION public.touch_club_banking_audit();

-- Step 3: Migrate any remaining banking data from clubs to club_banking
-- First, run the existing migration function to ensure all data is moved
SELECT public.migrate_club_banking_data();

-- Step 4: Drop the RLS policies with audit logging (they're complex and not needed)
DROP POLICY IF EXISTS "Admins can view banking with full audit" ON public.club_banking;
DROP POLICY IF EXISTS "Only club owners can view their banking details" ON public.club_banking;

-- Step 5: Create simplified, secure RLS policies for club_banking
-- Admins can do everything
CREATE POLICY "club_banking_admin_all" ON public.club_banking
FOR ALL 
USING (get_current_user_role() = 'ADMIN'::user_role) 
WITH CHECK (get_current_user_role() = 'ADMIN'::user_role);

-- Club users can only access their own club's banking data
CREATE POLICY "club_banking_club_rw" ON public.club_banking
FOR ALL 
USING (
  get_current_user_role() = 'CLUB'::user_role AND 
  club_id = get_current_user_club_id()
) 
WITH CHECK (
  get_current_user_role() = 'CLUB'::user_role AND 
  club_id = get_current_user_club_id()
);

-- Step 6: Drop banking columns from clubs table (after data migration)
-- First verify data has been migrated by checking if any clubs have banking data not in club_banking
DO $$
DECLARE
  unmigrated_count integer;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM public.clubs 
  WHERE (bank_account_number IS NOT NULL OR bank_iban IS NOT NULL)
    AND id NOT IN (SELECT club_id FROM public.club_banking WHERE club_id IS NOT NULL);
    
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop banking columns: % clubs still have unmigrated banking data', unmigrated_count;
  END IF;
END $$;

-- Now safe to drop the banking columns from clubs table
ALTER TABLE public.clubs 
  DROP COLUMN IF EXISTS bank_account_holder,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_sort_code,
  DROP COLUMN IF EXISTS bank_iban,
  DROP COLUMN IF EXISTS bank_swift;

-- Step 7: Ensure no public grants exist on sensitive tables
REVOKE ALL ON public.clubs FROM anon;
REVOKE ALL ON public.clubs FROM authenticated;
REVOKE ALL ON public.club_banking FROM anon;
REVOKE ALL ON public.club_banking FROM authenticated;

-- Step 8: Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_club_banking_club_id ON public.club_banking(club_id);