import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    // Get the authorization header to validate the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create client with user's token to validate they are admin
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      console.error('Admin check failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User authenticated as admin:', user.email);

    // Parse the request body
    const { leadId, clubName, adminEmail, metadata } = await req.json();
    
    // Log function start with details
    console.log('Convert-to-Club started', { userId: user.id, leadId });
    console.log('Conversion request:', { leadId, clubName, adminEmail, metadata });

    // Validate required fields
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!clubName || clubName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Club name is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!adminEmail || !adminEmail.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid admin email is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call the database function to handle the conversion
    const rpcPayload = {
      p_lead_id: leadId,
      p_club_name: clubName,
      p_admin_email: adminEmail,
      p_metadata: metadata || {}
    };
    console.log('Calling RPC convert_to_club', rpcPayload);
    
    const { data: result, error: rpcError } = await userSupabase.rpc('convert_partnership_lead_to_club', rpcPayload);
    
    // Log RPC response
    console.log('RPC Response:', { 
      status: rpcError ? 'error' : 'success', 
      data: result, 
      error: rpcError 
    });

    if (rpcError) {
      console.error('Convert-to-Club ERROR:', rpcError.message);
      
      // Handle specific error cases
      if (rpcError.code === '28000') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }), 
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Conversion failed', 
          details: rpcError.message,
          hint: rpcError.hint 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Conversion returned no result' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Conversion completed successfully:', result);
    console.log('Convert-to-Club finished', { elapsedMs: Date.now() - startTime });
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          leadId,
          clubId: result.club_id,
          clubName: result.club_name,
          adminEmail: result.admin_email
        }
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Convert-to-Club ERROR:', error.message);
    console.log('Convert-to-Club finished', { elapsedMs: Date.now() - startTime });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});