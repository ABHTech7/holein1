-- Seed data
-- First, insert clubs
INSERT INTO public.clubs (id, name, address, phone, email, website) VALUES
('11111111-1111-1111-1111-111111111111', 'Pine Valley Golf Club', '123 Pine Valley Rd, Anytown, ST 12345', '(555) 123-4567', 'info@pinevalleygc.com', 'https://pinevalleygc.com'),
('22222222-2222-2222-2222-222222222222', 'Oak Ridge Country Club', '456 Oak Ridge Dr, Somewhere, ST 67890', '(555) 987-6543', 'contact@oakridgecc.com', 'https://oakridgecc.com');

-- Insert competitions with different statuses
INSERT INTO public.competitions (id, club_id, name, description, start_date, end_date, status, entry_fee, max_participants, prize_pool) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Spring Championship', 'Annual spring tournament with hole-in-one challenge', '2024-04-15 09:00:00+00', '2024-04-15 17:00:00+00', 'ENDED', 50.00, 100, 1000.00),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Summer Classic', 'Mid-season tournament featuring multiple challenges', now() - interval '1 day', now() + interval '7 days', 'ACTIVE', 75.00, 80, 1500.00),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Fall Masters', 'Prestigious end-of-season championship', now() + interval '30 days', now() + interval '32 days', 'SCHEDULED', 100.00, 60, 2000.00);

-- Create demo users directly in auth.users first (this would normally be done via signup)
-- Note: In a real app, these would be created through Supabase Auth signup
-- For demo purposes, we'll create profiles with known IDs and associate them with test auth users

-- Insert demo profiles (these will reference auth users that need to be created via Supabase Auth)
-- The trigger will handle profile creation for real signups, but for seed data we need to insert directly
INSERT INTO public.profiles (id, email, first_name, last_name, role, club_id) VALUES
-- Admin user
('99999999-9999-9999-9999-999999999999', 'admin@holein1challenge.com', 'Admin', 'User', 'ADMIN', NULL),
-- Club managers
('88888888-8888-8888-8888-888888888888', 'manager@pinevalleygc.com', 'John', 'Manager', 'CLUB', '11111111-1111-1111-1111-111111111111'),
('77777777-7777-7777-7777-777777777777', 'manager@oakridgecc.com', 'Sarah', 'Wilson', 'CLUB', '22222222-2222-2222-2222-222222222222'),
-- Players
('66666666-6666-6666-6666-666666666666', 'player1@example.com', 'Mike', 'Johnson', 'PLAYER', NULL),
('55555555-5555-5555-5555-555555555555', 'player2@example.com', 'Emily', 'Davis', 'PLAYER', NULL),
('44444444-4444-4444-4444-444444444444', 'player3@example.com', 'Chris', 'Brown', 'PLAYER', NULL),
('33333333-3333-3333-3333-333333333333', 'player4@example.com', 'Lisa', 'Miller', 'PLAYER', NULL),
('22222222-3333-3333-3333-333333333333', 'player5@example.com', 'David', 'Wilson', 'PLAYER', NULL);

-- Insert sample entries for competitions
INSERT INTO public.entries (competition_id, player_id, paid, score, completed_at) VALUES
-- Spring Championship (ENDED) - completed entries
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', true, 72, '2024-04-15 16:30:00+00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', true, 75, '2024-04-15 16:45:00+00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', true, 68, '2024-04-15 16:20:00+00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', true, 80, '2024-04-15 17:00:00+00'),

-- Summer Classic (ACTIVE) - mix of completed and ongoing
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', true, 70, now() - interval '2 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', true, NULL, NULL),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', true, NULL, NULL),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', true, 74, now() - interval '1 hour'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-3333-3333-3333-333333333333', true, NULL, NULL),

-- Fall Masters (SCHEDULED) - just registrations
('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', true, NULL, NULL),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', false, NULL, NULL),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', true, NULL, NULL);

-- Insert some sample claims
INSERT INTO public.claims (entry_id, hole_number, witness_name, witness_contact, status, notes) 
SELECT e.id, 7, 'Bob Thompson', 'bob@example.com', 'PENDING', 'Clean hole-in-one on par 3'
FROM public.entries e 
WHERE e.competition_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' 
AND e.player_id = '44444444-4444-4444-4444-444444444444';

INSERT INTO public.claims (entry_id, hole_number, witness_name, witness_contact, status, verified_by, verified_at, notes) 
SELECT e.id, 12, 'Alice Green', 'alice@example.com', 'VERIFIED', '88888888-8888-8888-8888-888888888888', now() - interval '1 day', 'Verified hole-in-one with video evidence'
FROM public.entries e 
WHERE e.competition_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' 
AND e.player_id = '66666666-6666-6666-6666-666666666666';

-- Insert some sample leads
INSERT INTO public.leads (club_id, name, email, phone, source, status, notes) VALUES
('11111111-1111-1111-1111-111111111111', 'Tom Anderson', 'tom@example.com', '(555) 111-2222', 'Website', 'NEW', 'Interested in membership and tournaments'),
('11111111-1111-1111-1111-111111111111', 'Rachel Smith', 'rachel@example.com', '(555) 333-4444', 'Referral', 'CONTACTED', 'Called on Monday, following up this week'),
('22222222-2222-2222-2222-222222222222', 'Mark Taylor', 'mark@example.com', '(555) 555-6666', 'Event', 'CONVERTED', 'Signed up after demo day'),
('22222222-2222-2222-2222-222222222222', 'Jennifer Lee', 'jennifer@example.com', '(555) 777-8888', 'Social Media', 'CONTACTED', 'Responded to Instagram ad');

-- Insert sample audit events
INSERT INTO public.audit_events (user_id, action, entity_type, entity_id, new_values) VALUES
('88888888-8888-8888-8888-888888888888', 'CREATE', 'competition', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"name": "Summer Classic", "status": "ACTIVE"}'),
('99999999-9999-9999-9999-999999999999', 'UPDATE', 'user', '77777777-7777-7777-7777-777777777777', '{"role": "CLUB"}'),
('77777777-7777-7777-7777-777777777777', 'UPDATE', 'lead', (SELECT id FROM public.leads WHERE name = 'Mark Taylor'), '{"status": "CONVERTED"}');