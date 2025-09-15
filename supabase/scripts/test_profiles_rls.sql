-- Run these manually in the SQL editor (with an authenticated user JWT) after migration:

-- Expect 0 or 1 row, only your own:
SELECT * FROM public.profiles WHERE id = auth.uid();

-- Upsert your own row should succeed:
INSERT INTO public.profiles (id, email, first_name, last_name)
VALUES (auth.uid(), 'me@example.com', 'Me', 'Player')
ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name;

-- Update your own row should succeed:
UPDATE public.profiles SET first_name = 'Updated' WHERE id = auth.uid();

-- Selecting someone else's row should return 0 rows unless admin JWT is used.