import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'ADMIN' | 'SUPER_ADMIN' | 'INSURANCE_PARTNER'; // Optional, defaults to ADMIN
  insuranceCompanyId?: string;
  insuranceRole?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Admin creation request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { email, firstName, lastName, password, role = 'ADMIN', insuranceCompanyId, insuranceRole }: CreateAdminRequest = await req.json();
    
    console.log("Processing admin creation for:", email);

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

    // Get the current user from the JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication failed:", userError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Authentication required" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get the current user's profile to check their role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to get user profile:", profileError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to verify user permissions" 
      }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Only SUPER_ADMIN can create ADMIN or SUPER_ADMIN users
    // ADMIN can create INSURANCE_PARTNER users
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      if (profile.role !== 'SUPER_ADMIN') {
        console.error("Insufficient permissions for ADMIN/SUPER_ADMIN creation:", profile.role);
        return new Response(JSON.stringify({ 
          success: false,
          error: "Only Super Admins can create Admin accounts" 
        }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else if (role === 'INSURANCE_PARTNER') {
      if (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
        console.error("Insufficient permissions for INSURANCE_PARTNER creation:", profile.role);
        return new Response(JSON.stringify({ 
          success: false,
          error: "Only Admins can create Insurance Partner accounts" 
        }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Create the admin user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    });

    if (createError || !userData.user) {
      console.error("Error creating admin user:", createError);
      throw new Error("Failed to create admin account");
    }

    // Create/update the profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role
      });

    if (profileError) {
      console.error("Error creating admin profile:", profileError);
      // Don't fail the request, just log the error
    }

    // If it's an insurance partner, create the insurance user link
    if (role === 'INSURANCE_PARTNER' && insuranceCompanyId) {
      const { error: insuranceError } = await supabaseAdmin
        .from('insurance_users')
        .insert({
          user_id: userData.user.id,
          insurance_company_id: insuranceCompanyId,
          role: insuranceRole || 'viewer'
        });
      
      if (insuranceError) {
        console.error('Error creating insurance user link:', insuranceError);
        // Don't fail the request, just log the error
      }
    }

    // Log the admin creation in audit events
    const { error: auditError } = await supabaseAdmin
      .from('audit_events')
      .insert({
        entity_type: 'admin_creation',
        entity_id: userData.user.id,
        action: 'CREATE',
        new_values: {
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: role,
          created_via: 'secure_endpoint'
        },
        user_id: null, // System action
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    if (auditError) {
      console.error("Error logging admin creation audit:", auditError);
    }

    console.log("Admin user created successfully:", userData.user.id);

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in create-admin-user function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to create admin user" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);