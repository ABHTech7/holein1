-- Fix existing clubs without contracts to be inactive
UPDATE public.clubs 
SET active = false, updated_at = now()
WHERE contract_signed = false 
  AND contract_url IS NULL 
  AND active = true;

-- Create trigger to enforce contract requirement for activation
CREATE OR REPLACE FUNCTION public.enforce_club_contract_requirement()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only allow activation if contract is signed OR contract is uploaded
  IF NEW.active = true AND (NEW.contract_signed = false AND NEW.contract_url IS NULL) THEN
    RAISE EXCEPTION 'Club cannot be activated without a signed contract or uploaded contract document';
  END IF;
  
  -- Auto-deactivate if contract is removed and not manually signed
  IF OLD.contract_url IS NOT NULL AND NEW.contract_url IS NULL AND NEW.contract_signed = false THEN
    NEW.active = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on clubs table
DROP TRIGGER IF EXISTS enforce_contract_requirement ON public.clubs;
CREATE TRIGGER enforce_contract_requirement
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_club_contract_requirement();