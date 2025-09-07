-- Insert sample venues for testing the new player journey
-- First, get a club ID to associate with venues
DO $$
DECLARE
    sample_club_id UUID;
BEGIN
    -- Get the first active club
    SELECT id INTO sample_club_id FROM public.clubs WHERE active = true AND archived = false LIMIT 1;
    
    IF sample_club_id IS NOT NULL THEN
        -- Insert sample venues
        INSERT INTO public.venues (slug, name, club_id) VALUES
        ('royal-oak-golf', 'Royal Oak Golf Club', sample_club_id),
        ('meadowbrook-country', 'Meadowbrook Country Club', sample_club_id),
        ('pine-valley-golf', 'Pine Valley Golf Course', sample_club_id)
        ON CONFLICT (slug) DO NOTHING;
    END IF;
END $$;