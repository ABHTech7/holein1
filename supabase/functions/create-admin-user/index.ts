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
  adminSecretKey: string;
  role?: 'ADMIN' | 'SUPER_ADMIN'; // Optional, defaults to ADMIN
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
    const { email, firstName, lastName, password, adminSecretKey, role = 'ADMIN' }: CreateAdminRequest = await req.json();
    
    console.log("Processing admin creation for:", email);

    // Verify the admin secret key
    const expectedSecretKey = Deno.env.get("ADMIN_CREATION_SECRET");
    if (!expectedSecretKey || adminSecretKey !== expectedSecretKey) {
      console.error("Invalid admin secret key provided");
      return new Response(JSON.stringify({ 
        success: false,
        error: "Unauthorized admin creation attempt" 
      }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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