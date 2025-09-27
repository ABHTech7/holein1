import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Admin get clubs request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let showArchived = false;
    
    // Handle both GET (query params) and POST (body) requests
    if (req.method === "GET") {
      const url = new URL(req.url);
      showArchived = url.searchParams.get('archived') === 'true';
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        showArchived = body.archived === true;
      } catch (e) {
        // If no body or invalid JSON, default to false
        showArchived = false;
      }
    }
    // Initialize Supabase clients
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          },
        },
      }
    );

    // Get the current user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "Authentication required" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify admin permissions
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "Admin permissions required" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse query parameters
    console.log("Fetching clubs data, archived:", showArchived);

    // Get clubs using service role to bypass RLS
    const { data: clubsData, error: clubsError } = await supabaseAdmin
      .from('clubs')
      .select(`
        id, name, address, email, phone, website, logo_url,
        active, created_at, updated_at, archived, contract_signed, contract_url
      `)
      .eq('archived', showArchived)
      .order('created_at', { ascending: false });

    if (clubsError) {
      console.error("Error fetching clubs:", clubsError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to fetch clubs",
        details: clubsError.message
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Enhance clubs with statistics
    const clubsWithStats = await Promise.all(
      (clubsData || []).map(async (club) => {
        // Get competitions
        const { data: competitions } = await supabaseAdmin
          .from('competitions')
          .select('id, entry_fee, commission_amount')
          .eq('club_id', club.id);

        // Get manager details
        const { data: managers } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('club_id', club.id)
          .eq('role', 'CLUB')
          .limit(1);

        // Calculate revenue and commission
        let totalRevenue = 0;
        let totalCommission = 0;

        if (competitions) {
          const revenuePromises = competitions.map(async (competition) => {
            const { data: entries } = await supabaseAdmin
              .from('entries')
              .select('id, paid')
              .eq('competition_id', competition.id);

            const paidEntries = entries?.filter(entry => entry.paid).length || 0;
            const entryFee = parseFloat(competition.entry_fee?.toString() || '0');
            const commissionAmount = parseFloat(competition.commission_amount?.toString() || '0');

            return {
              revenue: paidEntries * entryFee,
              commission: paidEntries * commissionAmount
            };
          });

          const results = await Promise.all(revenuePromises);
          totalRevenue = results.reduce((sum, result) => sum + result.revenue, 0);
          totalCommission = results.reduce((sum, result) => sum + result.commission, 0);
        }

        const manager = managers?.[0];
        const managerName = manager ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() : null;

        return {
          ...club,
          total_competitions: competitions?.length || 0,
          total_revenue: totalRevenue,
          total_commission: totalCommission,
          manager_name: managerName || null,
          manager_email: manager?.email || null
        };
      })
    );

    console.log(`Clubs data fetched successfully: ${clubsWithStats.length} clubs`);

    return new Response(JSON.stringify({ 
      success: true,
      clubs: clubsWithStats
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in admin-get-clubs function:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || "Failed to fetch clubs",
      details: error.details || null
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);