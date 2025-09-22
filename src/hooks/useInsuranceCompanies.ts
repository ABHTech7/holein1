import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InsuranceCompany {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string;
  premium_rate_per_entry: number;
  active: boolean;
  created_at: string;
}

export const useInsuranceCompanies = () => {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('active', true)
        .order('name');

      if (fetchError) throw fetchError;
      
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching insurance companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insurance companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies
  };
};