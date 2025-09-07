-- Update competition commission amounts and clean up any data issues
UPDATE competitions 
SET commission_amount = CASE 
    WHEN entry_fee = 1000 THEN 150.00  -- £10 entry = £1.50 commission (15%)
    WHEN entry_fee = 2500 THEN 375.00  -- £25 entry = £3.75 commission (15%)  
    WHEN entry_fee = 5000 THEN 750.00  -- £50 entry = £7.50 commission (15%)
    ELSE entry_fee * 0.15
END
WHERE club_id = '74f54310-ee8b-4b39-b3c1-76f7994647b0';