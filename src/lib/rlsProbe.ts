/**
 * RLS Probe - Tests database permissions based on user role
 * Only runs in development to help debug Row Level Security issues
 */
export async function probeRLS(label: string) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.log(`🔍 [RLS Probe: ${label}] Starting database permission tests...`);

  try {
    // Dynamic import to avoid loading in production bundles
    const { supabase } = await import('@/integrations/supabase/client');

    // 1. Fetch current user profile
    console.log(`🔍 [RLS Probe: ${label}] Testing profile access...`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, club_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
      .maybeSingle();

    console.log(`🔍 [RLS Probe: ${label}] Profile:`, { 
      ok: !profileError, 
      data: profile, 
      error: profileError 
    });

    if (profileError || !profile) {
      console.log(`🔍 [RLS Probe: ${label}] No profile found, stopping probe`);
      return;
    }

    // 2. Role-based queries
    if (profile.role === 'CLUB' && profile.club_id) {
      console.log(`🔍 [RLS Probe: ${label}] Testing CLUB role permissions...`);

      // Test clubs access (own club)
      console.log(`🔍 [RLS Probe: ${label}] Testing clubs access...`);
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('id', profile.club_id)
        .single();

      console.log(`🔍 [RLS Probe: ${label}] Clubs:`, { 
        ok: !clubError, 
        data: club, 
        error: clubError 
      });

      // Test competitions access (own club's competitions)
      console.log(`🔍 [RLS Probe: ${label}] Testing competitions access...`);
      const { data: competitions, error: competitionsError } = await supabase
        .from('competitions')
        .select('id, name')
        .eq('club_id', profile.club_id)
        .limit(5);

      console.log(`🔍 [RLS Probe: ${label}] Competitions:`, { 
        ok: !competitionsError, 
        data: competitions, 
        error: competitionsError 
      });

      // Test entries access (entries for own club's competitions)
      console.log(`🔍 [RLS Probe: ${label}] Testing entries access...`);
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select(`
          id, 
          entry_date,
          competitions!inner(id, club_id)
        `)
        .eq('competitions.club_id', profile.club_id)
        .limit(5);

      console.log(`🔍 [RLS Probe: ${label}] Entries:`, { 
        ok: !entriesError, 
        data: entries, 
        error: entriesError 
      });

    } else if (profile.role === 'ADMIN') {
      console.log(`🔍 [RLS Probe: ${label}] Testing ADMIN role permissions...`);

      // Test clubs access (all clubs)
      console.log(`🔍 [RLS Probe: ${label}] Testing clubs access...`);
      const { data: clubs, error: clubsError } = await supabase
        .from('clubs')
        .select('id, name')
        .limit(3);

      console.log(`🔍 [RLS Probe: ${label}] Clubs:`, { 
        ok: !clubsError, 
        data: clubs, 
        error: clubsError 
      });

    } else {
      console.log(`🔍 [RLS Probe: ${label}] Role: ${profile.role}, no specific tests defined`);
    }

    console.log(`🔍 [RLS Probe: ${label}] Probe completed`);

  } catch (error) {
    console.error(`🔍 [RLS Probe: ${label}] Probe failed:`, error);
  }
}