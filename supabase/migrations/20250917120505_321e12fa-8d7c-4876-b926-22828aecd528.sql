-- Safe Player Data Cleanup - Preserve demo player (player1@holein1.test)
-- This removes all non-demo player data while maintaining referential integrity

BEGIN;

-- Get the demo player ID for safety checks
DO $$
DECLARE
    demo_player_id UUID;
    cleanup_count INTEGER;
BEGIN
    -- Find the demo player ID
    SELECT id INTO demo_player_id 
    FROM public.profiles 
    WHERE email = 'player1@holein1.test' AND role = 'PLAYER';
    
    IF demo_player_id IS NULL THEN
        RAISE EXCEPTION 'Demo player not found! Aborting cleanup for safety.';
    END IF;
    
    RAISE NOTICE 'Demo player ID found: %', demo_player_id;
    
    -- Phase 1: Clean up data dependencies
    
    -- 1. Delete claims associated with entries from non-demo players
    DELETE FROM public.claims 
    WHERE entry_id IN (
        SELECT e.id 
        FROM public.entries e
        JOIN public.profiles p ON e.player_id = p.id
        WHERE p.role = 'PLAYER' AND p.email != 'player1@holein1.test'
    );
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % claims from non-demo players', cleanup_count;
    
    -- 2. Delete verifications associated with entries from non-demo players
    DELETE FROM public.verifications 
    WHERE entry_id IN (
        SELECT e.id 
        FROM public.entries e
        JOIN public.profiles p ON e.player_id = p.id
        WHERE p.role = 'PLAYER' AND p.email != 'player1@holein1.test'
    );
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % verifications from non-demo players', cleanup_count;
    
    -- 3. Delete entries from non-demo players
    DELETE FROM public.entries 
    WHERE player_id IN (
        SELECT id 
        FROM public.profiles 
        WHERE role = 'PLAYER' AND email != 'player1@holein1.test'
    );
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % entries from non-demo players', cleanup_count;
    
    -- 4. Delete magic link tokens from non-demo players
    DELETE FROM public.magic_link_tokens 
    WHERE email != 'player1@holein1.test';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % magic link tokens from non-demo players', cleanup_count;
    
    -- 5. Delete uploaded files from non-demo players
    DELETE FROM public.uploaded_files 
    WHERE user_id IN (
        SELECT id 
        FROM public.profiles 
        WHERE role = 'PLAYER' AND email != 'player1@holein1.test'
    );
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % uploaded files from non-demo players', cleanup_count;
    
    -- Phase 2: Clean up user data
    
    -- 6. Delete profiles for non-demo players
    DELETE FROM public.profiles 
    WHERE role = 'PLAYER' AND email != 'player1@holein1.test';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % profiles from non-demo players', cleanup_count;
    
    -- 7. Delete auth.users records for non-demo players (except demo player)
    DELETE FROM auth.users 
    WHERE id IN (
        SELECT au.id 
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE au.email != 'player1@holein1.test' 
        AND (p.id IS NULL OR p.role = 'PLAYER')
    );
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % auth.users records from non-demo players', cleanup_count;
    
    -- Verification: Ensure demo player still exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = demo_player_id) THEN
        RAISE EXCEPTION 'CRITICAL: Demo player was accidentally deleted! Rolling back.';
    END IF;
    
    RAISE NOTICE 'Cleanup completed successfully. Demo player preserved.';
    
END $$;

COMMIT;