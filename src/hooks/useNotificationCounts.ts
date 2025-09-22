import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationCounts {
  newLeads: number;
  pendingClaims: number;
  totalNotifications: number;
  isLoading: boolean;
  error: string | null;
}

export const useNotificationCounts = () => {
  const [counts, setCounts] = useState<NotificationCounts>({
    newLeads: 0,
    pendingClaims: 0,
    totalNotifications: 0,
    isLoading: true,
    error: null,
  });

  const fetchCounts = async () => {
    try {
      setCounts(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch NEW partnership enquiries
      const { count: newLeadsCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'NEW')
        .eq('source', 'Partnership Application');

      if (leadsError) throw leadsError;

      // Fetch pending claims (initiated, pending, under_review)
      const { count: pendingClaimsCount, error: claimsError } = await supabase
        .from('verifications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['initiated', 'pending', 'under_review']);

      if (claimsError) throw claimsError;

      const newLeads = newLeadsCount || 0;
      const pendingClaims = pendingClaimsCount || 0;
      const totalNotifications = newLeads + pendingClaims;

      setCounts({
        newLeads,
        pendingClaims,
        totalNotifications,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching notification counts:', error);
      setCounts(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch notification counts',
      }));
    }
  };

  useEffect(() => {
    fetchCounts();

    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);

    // Set up real-time subscriptions for live updates
    const leadsChannel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: 'source=eq.Partnership Application'
        },
        () => fetchCounts()
      )
      .subscribe();

    const verificationsChannel = supabase
      .channel('verifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verifications'
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(verificationsChannel);
    };
  }, []);

  return { ...counts, refetch: fetchCounts };
};