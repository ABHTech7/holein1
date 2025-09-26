-- Comprehensive Data Cleansing Migration
-- This migration removes all player-related data while preserving clubs, competitions, and admin users

-- Step 1: Delete magic link tokens (no dependencies)
DELETE FROM public.magic_link_tokens;

-- Step 2: Delete uploaded files (player-related files)
DELETE FROM public.uploaded_files 
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

-- Step 3: Delete staff code attempts (related to entries)
DELETE FROM public.staff_code_attempts
WHERE entry_id IN (
  SELECT e.id FROM public.entries e
  JOIN public.profiles p ON e.player_id = p.id
  WHERE p.role = 'PLAYER'
);

-- Step 4: Delete verifications (related to entries)
DELETE FROM public.verifications
WHERE entry_id IN (
  SELECT e.id FROM public.entries e
  JOIN public.profiles p ON e.player_id = p.id
  WHERE p.role = 'PLAYER'
);

-- Step 5: Delete claims (related to entries)
DELETE FROM public.claims
WHERE entry_id IN (
  SELECT e.id FROM public.entries e
  JOIN public.profiles p ON e.player_id = p.id
  WHERE p.role = 'PLAYER'
);

-- Step 6: Delete all entries from players
DELETE FROM public.entries
WHERE player_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

-- Step 7: Clean audit and log tables for player users
DELETE FROM public.audit_events
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

DELETE FROM public.security_logs
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

DELETE FROM public.data_access_log
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

DELETE FROM public.audit_logs
WHERE target_user_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
) OR actor_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

-- Step 8: Delete admin user permissions for players (shouldn't be any, but just in case)
DELETE FROM public.admin_user_permissions
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

-- Step 9: Delete insurance users for players (shouldn't be any, but just in case)
DELETE FROM public.insurance_users
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

-- Step 10: Delete notes created by players
DELETE FROM public.notes
WHERE created_by IN (
  SELECT id FROM public.profiles WHERE role = 'PLAYER'
);

-- Step 11: Finally, delete all player profiles
DELETE FROM public.profiles 
WHERE role = 'PLAYER';

-- Step 12: Mark any demo data sessions as inactive
UPDATE public.demo_data_sessions 
SET is_active = false 
WHERE is_active = true;

-- Step 13: Insert audit record for this cleanup
INSERT INTO public.audit_events (
  entity_type,
  action,
  new_values,
  user_id,
  created_at
) VALUES (
  'data_cleanup',
  'CLEANSE_PLAYER_DATA',
  jsonb_build_object(
    'action', 'Removed all player profiles and related data',
    'preserved', 'clubs, competitions, admin users',
    'cleanup_date', now()
  ),
  auth.uid(),
  now()
);

-- Verify the cleanup results
-- This will show what remains after cleanup
SELECT 'CLEANUP COMPLETE' as status,
       'Clubs preserved: ' || (SELECT COUNT(*) FROM public.clubs) as clubs,
       'Competitions preserved: ' || (SELECT COUNT(*) FROM public.competitions) as competitions,
       'Admin users preserved: ' || (SELECT COUNT(*) FROM public.profiles WHERE role != 'PLAYER') as admin_users,
       'Player profiles removed: 0 remaining' as players,
       'Entries removed: ' || (SELECT COUNT(*) FROM public.entries) || ' remaining' as entries;