import { useEffect, useState } from 'react';
import useAuth from '@/hooks/useAuth';
import { getClubBankingDetailsSafe, isBankingComplete, ClubBanking } from '@/lib/bankingService';

export default function useBankingStatus() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ClubBanking | null>(null);
  const [complete, setComplete] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const clubId = profile?.club_id ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clubId) { 
        if (!cancelled) {
          setLoading(false);
          setHasChecked(true);
        }
        return; 
      }
      try {
        const d = await getClubBankingDetailsSafe(clubId);
        if (!cancelled) {
          const isComplete = isBankingComplete(d);
          setDetails(d);
          setComplete(isComplete);
          setHasChecked(true);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setHasChecked(true);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  return { loading, details, complete, clubId, hasChecked };
}