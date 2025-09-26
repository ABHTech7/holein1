// Supabase helpers with demo mode filtering
import { supabase } from '@/integrations/supabase/client';
import { isDemoModeEnabled } from './demoMode';

// Helper to add demo data filtering to queries
export const addDemoFilter = <T extends any>(query: T): T => {
  const shouldFilterDemo = !isDemoModeEnabled();
  
  if (shouldFilterDemo) {
    // Filter out demo data in production mode
    return (query as any).neq('is_demo_data', true);
  }
  
  // In demo mode, show all data (including demo data)
  return query;
};

// Helper functions for common filtered queries
export const getFilteredProfiles = () => {
  return addDemoFilter(
    supabase.from('profiles').select('*')
  );
};

export const getFilteredClubs = () => {
  return addDemoFilter(
    supabase.from('clubs').select('*')
  );
};

export const getFilteredCompetitions = () => {
  return addDemoFilter(
    supabase.from('competitions').select('*')
  );
};

export const getFilteredEntries = () => {
  return addDemoFilter(
    supabase.from('entries').select('*')
  );
};

// Helper for admin dashboard stats with demo filtering
export const getAdminStats = async () => {
  const shouldFilterDemo = !isDemoModeEnabled();
  
  // Build base queries
  let playersQuery = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'PLAYER').neq('status', 'deleted').is('deleted_at', null);
  let clubsQuery = supabase.from('clubs').select('id', { count: 'exact', head: true });
  let entriesQuery = supabase.from('entries').select('id', { count: 'exact', head: true });
  
  // Apply demo filtering if needed
  if (shouldFilterDemo) {
    playersQuery = playersQuery.neq('is_demo_data', true);
    clubsQuery = clubsQuery.neq('is_demo_data', true);
    entriesQuery = entriesQuery.neq('is_demo_data', true);
  }
  
  return {
    playersQuery,
    clubsQuery,
    entriesQuery
  };
};