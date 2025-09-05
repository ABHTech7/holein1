-- Add commission rate to competitions table
ALTER TABLE public.competitions 
ADD COLUMN commission_rate DECIMAL(10,2) DEFAULT 0.00;

-- Add bank account details to clubs table
ALTER TABLE public.clubs 
ADD COLUMN bank_account_holder TEXT,
ADD COLUMN bank_account_number TEXT,
ADD COLUMN bank_sort_code TEXT,
ADD COLUMN bank_iban TEXT,
ADD COLUMN bank_swift TEXT;

-- Create payments table to track commission payments to clubs
CREATE TABLE public.club_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_reference TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  entries_count INTEGER NOT NULL DEFAULT 0,
  commission_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on payments table
ALTER TABLE public.club_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
CREATE POLICY "Admins can manage all payments" 
ON public.club_payments 
FOR ALL 
TO authenticated 
USING (get_current_user_role() = 'ADMIN'::user_role);

CREATE POLICY "Club members can view their payments" 
ON public.club_payments 
FOR SELECT 
TO authenticated 
USING (club_id = get_current_user_club_id() AND get_current_user_role() = 'CLUB'::user_role);

-- Add trigger for updating timestamps on payments
CREATE TRIGGER update_club_payments_updated_at
BEFORE UPDATE ON public.club_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN public.competitions.commission_rate IS 'Fixed commission amount in GBP per entry for the club';
COMMENT ON TABLE public.club_payments IS 'Tracks commission payments made to clubs';
COMMENT ON COLUMN public.club_payments.period_start IS 'Start date of the commission period';
COMMENT ON COLUMN public.club_payments.period_end IS 'End date of the commission period';
COMMENT ON COLUMN public.club_payments.entries_count IS 'Number of entries included in this payment period';
COMMENT ON COLUMN public.club_payments.commission_rate IS 'Commission rate applied for this payment period';