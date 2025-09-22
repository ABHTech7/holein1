-- Add payment_required_at field to insurance_premiums table
ALTER TABLE insurance_premiums 
ADD COLUMN payment_required_at TIMESTAMP WITH TIME ZONE NULL;

-- Update the status column to use 'invoiced' as default instead of 'pending'
ALTER TABLE insurance_premiums 
ALTER COLUMN status SET DEFAULT 'invoiced';

-- Update existing 'pending' premiums to 'invoiced' status
UPDATE insurance_premiums 
SET status = 'invoiced' 
WHERE status = 'pending';