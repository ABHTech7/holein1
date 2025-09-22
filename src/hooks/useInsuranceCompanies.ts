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
  const [company, setCompany] = useState<InsuranceCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the single active insurance company
      const { data, error: fetchError } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('active', true)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      setCompany(data || null);
    } catch (err) {
      console.error('Error fetching insurance company:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insurance company');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  return {
    company,
    loading,
    error,
    refetch: fetchCompany
  };
};