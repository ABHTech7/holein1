import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClaimRow, StatusCounts, VerificationStatus } from '@/types/claims';
import { showSupabaseError } from '@/lib/showSupabaseError';
import useAuth from '@/hooks/useAuth';

interface ClaimsParams {
  search?: string;
  status?: 'all' | VerificationStatus;
  limit?: number;
  offset?: number;
}

interface ClaimsResult {
  rows: ClaimRow[];
  counts: StatusCounts;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const mapVerificationToClaimRow = (verification: any): ClaimRow => {
  const entry = verification.entries;
  const player = entry?.profiles;
  const competition = entry?.competitions;
  const club = competition?.clubs;

  return {
    id: verification.id,
    status: verification.status,
    created_at: verification.created_at,
    evidence_captured_at: verification.evidence_captured_at,
    entry_id: verification.entry_id,
    player_id: player?.id || '',
    player_first_name: player?.first_name,
    player_last_name: player?.last_name,
    player_email: player?.email || '',
    competition_id: competition?.id || '',
    competition_name: competition?.name || '',
    hole_number: competition?.hole_number,
    club_id: club?.id || '',
    club_name: club?.name || '',
    selfie_url: verification.selfie_url,
    id_document_url: verification.id_document_url,
    photos_count: [verification.selfie_url, verification.id_document_url].filter(Boolean).length
  };
};

const filterClaimRows = (rows: ClaimRow[], params: ClaimsParams): ClaimRow[] => {
  let filtered = rows;

  // Search filter
  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(claim => {
      const playerName = `${claim.player_first_name || ''} ${claim.player_last_name || ''}`.toLowerCase();
      return (
        playerName.includes(search) ||
        claim.player_email.toLowerCase().includes(search) ||
        claim.competition_name.toLowerCase().includes(search) ||
        claim.club_name.toLowerCase().includes(search)
      );
    });
  }

  return filtered;
};

export const useAdminClaims = (params: ClaimsParams = {}): ClaimsResult => {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ total: 0, pending: 0, verified: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile: userProfile } = useAuth();

  const fetchClaims = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.info('🔍 [useAdminClaims.fetchClaims] Starting admin claims fetch', {
        userProfile: {
          role: { _type: typeof userProfile?.role, value: userProfile?.role || 'undefined' },
          id: { _type: typeof userProfile?.id, value: userProfile?.id || 'undefined' },
          club_id: { _type: typeof userProfile?.club_id, value: userProfile?.club_id || 'undefined' }
        },
        operation: 'Fetching verifications with nested joins to entries, profiles, competitions, clubs',
        queryParams: {
          tables: ['verifications', 'entries', 'profiles', 'competitions', 'clubs'],
          filters: { status: params.status || 'all' },
          searchTerm: params.search || ''
        }
      });
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build base query
      let query = supabase
        .from('verifications')
        .select(`
          id, created_at, status, evidence_captured_at, entry_id,
          selfie_url, id_document_url,
          entries!inner(
            id, player_id,
            profiles!inner(id, first_name, last_name, email),
            competitions!inner(
              id, name, hole_number,
              clubs!inner(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Status filter
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const claimRows = (data || []).map(mapVerificationToClaimRow);
      const filteredRows = filterClaimRows(claimRows, params);
      
      setRows(filteredRows);

      // Calculate counts
      const allRows = (data || []).map(mapVerificationToClaimRow);
      setCounts({
        total: allRows.length,
        pending: allRows.filter(r => ['initiated', 'pending', 'under_review'].includes(r.status)).length,
        verified: allRows.filter(r => r.status === 'verified').length,
        rejected: allRows.filter(r => r.status === 'rejected').length
      });

    } catch (err) {
      const errorMessage = showSupabaseError(err, 'useAdminClaims.fetchClaims');
      
      if (process.env.NODE_ENV === 'development') {
        console.error('ADMIN CLAIMS ERROR:', {
          location: 'useAdminClaims.fetchClaims',
          userProfile: {
            role: { _type: typeof userProfile?.role, value: userProfile?.role || 'undefined' },
            id: { _type: typeof userProfile?.id, value: userProfile?.id || 'undefined' },
            club_id: { _type: typeof userProfile?.club_id, value: userProfile?.club_id || 'undefined' }
          },
          operation: 'Admin claims data fetching operation',
          queryParams: {
            table: 'verifications with nested joins',
            filters: { status: params.status || 'all' },
            searchTerm: params.search || ''
          },
          code: { _type: typeof (err as any)?.code, value: (err as any)?.code || 'undefined' },
          message: (err as any)?.message || '',
          details: { _type: typeof (err as any)?.details, value: (err as any)?.details || 'undefined' },
          hint: { _type: typeof (err as any)?.hint, value: (err as any)?.hint || 'undefined' },
          fullError: { message: (err as any)?.message || '' }
        });
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchClaims();
  };

  useEffect(() => {
    fetchClaims();
  }, [params.status]);

  return { rows, counts, isLoading, error, refetch };
};

export const useClubClaims = (params: ClaimsParams = {}): ClaimsResult => {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ total: 0, pending: 0, verified: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile: userProfile } = useAuth();

  const fetchClaims = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.info('🔍 [useClubClaims.fetchClaims] Starting club claims fetch', {
        userProfile: {
          role: { _type: typeof userProfile?.role, value: userProfile?.role || 'undefined' },
          id: { _type: typeof userProfile?.id, value: userProfile?.id || 'undefined' },
          club_id: { _type: typeof userProfile?.club_id, value: userProfile?.club_id || 'undefined' }
        },
        operation: 'Fetching verifications with RLS-filtered joins to entries, profiles, competitions, clubs',
        queryParams: {
          tables: ['verifications', 'entries', 'profiles', 'competitions', 'clubs'],
          filters: { status: params.status || 'all' },
          searchTerm: params.search || '',
          rlsFiltered: 'club-specific access'
        }
      });
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build base query - RLS automatically filters for club's competitions
      let query = supabase
        .from('verifications')
        .select(`
          id, created_at, status, evidence_captured_at, entry_id,
          selfie_url, id_document_url,
          entries!inner(
            id, player_id,
            profiles!inner(id, first_name, last_name, email),
            competitions!inner(
              id, name, hole_number,
              clubs!inner(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Status filter
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const claimRows = (data || []).map(mapVerificationToClaimRow);
      const filteredRows = filterClaimRows(claimRows, params);
      
      setRows(filteredRows);

      // Calculate counts
      const allRows = (data || []).map(mapVerificationToClaimRow);
      setCounts({
        total: allRows.length,
        pending: allRows.filter(r => ['initiated', 'pending', 'under_review'].includes(r.status)).length,
        verified: allRows.filter(r => r.status === 'verified').length,
        rejected: allRows.filter(r => r.status === 'rejected').length
      });

    } catch (err) {
      const errorMessage = showSupabaseError(err, 'useClubClaims.fetchClaims');
      
      if (process.env.NODE_ENV === 'development') {
        console.error('CLUB CLAIMS ERROR:', {
          location: 'useClubClaims.fetchClaims',
          userProfile: {
            role: { _type: typeof userProfile?.role, value: userProfile?.role || 'undefined' },
            id: { _type: typeof userProfile?.id, value: userProfile?.id || 'undefined' },
            club_id: { _type: typeof userProfile?.club_id, value: userProfile?.club_id || 'undefined' }
          },
          operation: 'Club claims data fetching operation',
          queryParams: {
            table: 'verifications with RLS-filtered joins',
            filters: { status: params.status || 'all' },
            searchTerm: params.search || ''
          },
          code: { _type: typeof (err as any)?.code, value: (err as any)?.code || 'undefined' },
          message: (err as any)?.message || '',
          details: { _type: typeof (err as any)?.details, value: (err as any)?.details || 'undefined' },
          hint: { _type: typeof (err as any)?.hint, value: (err as any)?.hint || 'undefined' },
          fullError: { message: (err as any)?.message || '' }
        });
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchClaims();
  };

  useEffect(() => {
    fetchClaims();
  }, [params.status]);

  return { rows, counts, isLoading, error, refetch };
};