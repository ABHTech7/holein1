import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PremiumCalculation {
  insurance_company_id: string;
  period_start: string;
  period_end: string;
  total_entries: number;
  premium_rate: number;
  total_premium_amount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting monthly premium calculation...');

    // Get request body to determine date range
    const body = await req.json();
    const { company_id, month, year } = body;

    let periodStartStr: string;
    let periodEndStr: string;

    // Use DB helper for UK timezone-aware month boundaries
    let boundariesResult;
    if (month && year) {
      // Calculate for specific month/year
      boundariesResult = await supabase.rpc('get_uk_month_boundaries', {
        p_year: year,
        p_month: month
      });
    } else {
      // Default to current UK month
      boundariesResult = await supabase.rpc('get_uk_month_boundaries');
    }

    if (boundariesResult.error || !boundariesResult.data || boundariesResult.data.length === 0) {
      console.error('Error fetching UK month boundaries:', boundariesResult.error);
      throw new Error('Failed to calculate UK month boundaries');
    }

    const boundaries = boundariesResult.data[0];
    periodStartStr = boundaries.month_start;
    periodEndStr = boundaries.month_end;

    console.log(`[UK Timezone] Calculated boundaries: ${periodStartStr} to ${periodEndStr}`);

    console.log(`Calculating premiums for period: ${periodStartStr} to ${periodEndStr}`);

    // Get all active insurance companies or specific company
    let companiesQuery = supabase
      .from('insurance_companies')
      .select('id, name, premium_rate_per_entry')
      .eq('active', true);

    if (company_id) {
      companiesQuery = companiesQuery.eq('id', company_id);
    }

    const { data: companies, error: companiesError } = await companiesQuery;

    if (companiesError) {
      console.error('Error fetching insurance companies:', companiesError);
      throw companiesError;
    }

    console.log(`Found ${companies?.length || 0} active insurance companies`);

    const calculations: PremiumCalculation[] = [];
    
    for (const company of companies || []) {
      console.log(`Processing company: ${company.name}`);
      
      // Check if premium already exists for this period
      const { data: existingPremium } = await supabase
        .from('insurance_premiums')
        .select('id')
        .eq('insurance_company_id', company.id)
        .eq('period_start', periodStartStr)
        .eq('period_end', periodEndStr)
        .single();

      if (existingPremium) {
        console.log(`Premium already exists for ${company.name} for this period, skipping`);
        continue;
      }

      // Count entries for this period
      const { count: entryCount, error: countError } = await supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .gte('entry_date', periodStartStr + 'T00:00:00Z')
        .lte('entry_date', periodEndStr + 'T23:59:59Z');

      if (countError) {
        console.error(`Error counting entries for ${company.name}:`, countError);
        continue;
      }

      const totalEntries = entryCount || 0;
      const totalPremium = totalEntries * company.premium_rate_per_entry;

      console.log(`Company ${company.name}: ${totalEntries} entries × £${company.premium_rate_per_entry} = £${totalPremium}`);

      const calculation: PremiumCalculation = {
        insurance_company_id: company.id,
        period_start: periodStartStr,
        period_end: periodEndStr,
        total_entries: totalEntries,
        premium_rate: company.premium_rate_per_entry,
        total_premium_amount: totalPremium
      };

      calculations.push(calculation);
    }

    // Insert all premium calculations
    if (calculations.length > 0) {
      const { data: insertedPremiums, error: insertError } = await supabase
        .from('insurance_premiums')
        .insert(calculations)
        .select();

      if (insertError) {
        console.error('Error inserting premium calculations:', insertError);
        throw insertError;
      }

      console.log(`Successfully created ${insertedPremiums?.length || 0} premium calculations`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Generated ${insertedPremiums?.length || 0} premium calculations`,
          period: { start: periodStartStr, end: periodEndStr },
          calculations: insertedPremiums
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      console.log('No new premium calculations needed');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new premium calculations needed',
          period: { start: periodStartStr, end: periodEndStr }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

  } catch (error) {
    console.error('Error in premium calculation:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error)?.message || 'Failed to calculate premiums'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});