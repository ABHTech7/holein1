import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClaimRow, StatusCounts, VerificationStatus } from '@/types/claims';

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

  const fetchClaims = async () => {
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
      console.error('Error fetching admin claims:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch claims');
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

  const fetchClaims = async () => {
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
      console.error('Error fetching club claims:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch claims');
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