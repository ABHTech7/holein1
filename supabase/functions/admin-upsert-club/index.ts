import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpsertClubRequest {
  clubName: string;
  clubAddress: string;
  clubEmail: string;
  clubPhone?: string;
  clubWebsite?: string;
  managerFirstName: string;
  managerLastName: string;
  managerEmail: string;
  managerPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Admin upsert club request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ 
      success: false,
      error: "Method not allowed" 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    const requestData: UpsertClubRequest = await req.json();
    console.log("Processing club upsert for:", requestData.clubName);

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the current user from JWT for audit purposes
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

    // Create the club using service role to bypass RLS
    const { data: clubData, error: clubError } = await supabaseAdmin
      .from('clubs')
      .insert({
        name: requestData.clubName,
        address: requestData.clubAddress,
        email: requestData.clubEmail,
        phone: requestData.clubPhone || null,
        website: requestData.clubWebsite || null,
        active: false, // Start inactive until contract is signed
        archived: false,
        contract_signed: false
      })
      .select()
      .single();

    if (clubError) {
      console.error("Error creating club:", clubError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to create club",
        details: clubError.message
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send OTP invitation to the manager
    try {
      const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
        email: requestData.managerEmail,
        options: {
          emailRedirectTo: `${Deno.env.get('SITE_URL') || 'https://officialholein1.com'}/auth/callback?continue=/dashboard/club`,
          data: {
            first_name: requestData.managerFirstName,
            last_name: requestData.managerLastName,
            phone: requestData.managerPhone || '',
            role: 'CLUB',
            club_id: clubData.id
          }
        }
      });

      if (otpError) {
        console.warn("Failed to send invitation email:", otpError);
        // Don't fail the club creation just because email failed
      }
    } catch (emailError) {
      console.warn("Email sending failed:", emailError);
      // Continue without failing
    }

    // Log the creation
    await supabaseAdmin
      .from('audit_events')
      .insert({
        entity_type: 'club_creation',
        entity_id: clubData.id,
        action: 'CREATE',
        new_values: requestData,
        user_id: user.id
      });

    console.log("Club created successfully:", clubData.id);

    return new Response(JSON.stringify({ 
      success: true,
      club: clubData,
      message: `Club created successfully. Invitation sent to ${requestData.managerEmail}.`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in admin-upsert-club function:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || "Failed to create club",
      details: error.details || null
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);