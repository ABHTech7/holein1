import { useEffect, useState } from 'react';
import useAuth from '@/hooks/useAuth';
import { getClubBankingDetailsSafe, isBankingComplete, ClubBanking } from '@/lib/bankingService';

export type BankingStatusType = 'idle' | 'loading' | 'ready';

export interface BankingStatusReturn {
  status: BankingStatusType;
  loading: boolean; // Deprecated, for backward compatibility
  details: ClubBanking | null;
  complete: boolean;
  clubId: string | null;
  hasChecked: boolean;
}

export default function useBankingStatus(): BankingStatusReturn {
  const { profile, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<BankingStatusType>('idle');
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ClubBanking | null>(null);
  const [complete, setComplete] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const clubId = profile?.club_id ?? null;

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: NodeJS.Timeout | null = null;

    const updateStatus = () => {
      if (cancelled) return;
      
      // Don't show banner while auth is loading
      if (authLoading) {
        setStatus('idle');
        setLoading(true);
        setHasChecked(false);
        return;
      }
      
      // Don't show banner when there's no clubId
      if (!clubId) { 
        setStatus('ready');
        setDetails(null);
        setComplete(false);
        setLoading(false);
        setHasChecked(false);
        return; 
      }
      
      // Start loading state
      setStatus('loading');
      setLoading(true);
      setHasChecked(false);
      
      // Debounce the actual fetch to prevent flash
      debounceTimer = setTimeout(async () => {
        if (cancelled) return;
        
        try {
          const d = await getClubBankingDetailsSafe(clubId);
          if (!cancelled) {
            const isComplete = isBankingComplete(d);
            setDetails(d);
            setComplete(isComplete);
            setStatus('ready');
            setLoading(false);
            setHasChecked(true);
          }
        } catch (error) {
          if (!cancelled) {
            setStatus('ready');
            setLoading(false);
            setHasChecked(true);
          }
        }
      }, 200); // 200ms debounce to prevent flash
    };

    updateStatus();

    return () => { 
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [authLoading, clubId]);

  return { status, loading, details, complete, clubId, hasChecked };
}