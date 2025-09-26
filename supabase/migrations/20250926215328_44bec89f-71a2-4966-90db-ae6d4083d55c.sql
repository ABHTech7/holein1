-- Step 1: Fix existing demo profiles that have wrong is_demo_data flag
UPDATE public.profiles 
SET is_demo_data = true, updated_at = now()
WHERE (email LIKE '%@demo-golfer.test' OR email LIKE '%@demo.holein1.test')
  AND is_demo_data = false;

-- Step 2: Ensure demo clubs are properly marked
UPDATE public.clubs 
SET is_demo_data = true, updated_at = now()
WHERE name LIKE 'Demo%' 
  AND is_demo_data = false;

-- Step 3: Ensure demo competitions are properly marked  
UPDATE public.competitions c
SET is_demo_data = true, updated_at = now()
FROM public.clubs cl
WHERE c.club_id = cl.id 
  AND cl.is_demo_data = true 
  AND c.is_demo_data = false;