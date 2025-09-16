import { useEffect, useState } from 'react';
import useAuth from '@/hooks/useAuth';
import { getClubBankingDetailsSafe, isBankingComplete, ClubBanking } from '@/lib/bankingService';

export default function useBankingStatus() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ClubBanking | null>(null);
  const [complete, setComplete] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const clubId = profile?.club_id ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Don't show banner while auth is loading
      if (authLoading) {
        if (!cancelled) {
          setLoading(true);
          setHasChecked(false);
        }
        return;
      }
      
      // Don't show banner when there's no clubId
      if (!clubId) { 
        if (!cancelled) {
          setDetails(null);
          setComplete(false);
          setLoading(false);
          setHasChecked(false);
        }
        return; 
      }
      
      // Reset state for this specific clubId
      if (!cancelled) {
        setLoading(true);
        setHasChecked(false);
      }
      
      try {
        const d = await getClubBankingDetailsSafe(clubId);
        if (!cancelled) {
          const isComplete = isBankingComplete(d);
          setDetails(d);
          setComplete(isComplete);
          setLoading(false);
          setHasChecked(true);
        }
      } catch (error) {
        if (!cancelled) {
          setLoading(false);
          setHasChecked(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, clubId]);

  return { loading, details, complete, clubId, hasChecked };
}