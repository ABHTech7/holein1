import { useEffect, useState } from 'react';
import useAuth from '@/hooks/useAuth';
import { getClubBankingDetailsSafe, isBankingComplete, ClubBanking } from '@/lib/bankingService';

export default function useBankingStatus() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ClubBanking | null>(null);
  const [complete, setComplete] = useState(false);
  const clubId = profile?.club_id ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clubId) { setLoading(false); return; }
      try {
        const d = await getClubBankingDetailsSafe(clubId);
        if (!cancelled) {
          setDetails(d);
          setComplete(isBankingComplete(d));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  return { loading, details, complete, clubId };
}