import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyMagicLinkRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Magic link verification request received:", req.method);

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
    const { token }: VerifyMagicLinkRequest = await req.json();
    
    console.log("Verifying magic link token");

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up the magic link token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('magic_link_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.error("Invalid or expired token:", tokenError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Invalid or expired magic link" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(tokenData.email);

    let user;
    if (existingUser.user) {
      // User exists, just sign them in
      user = existingUser.user;
      console.log("Existing user found, signing in:", user.id);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: tokenData.email,
        email_confirm: true, // Auto-confirm email since they clicked the magic link
        user_metadata: {
          first_name: tokenData.first_name,
          last_name: tokenData.last_name,
          phone: tokenData.phone_e164,
          age_years: tokenData.age_years,
          handicap: tokenData.handicap,
          role: 'PLAYER'
        }
      });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        throw new Error("Failed to create user account");
      }

      user = newUser.user;
      console.log("New user created:", user.id);
    }

    // Update user profile with the collected information
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: tokenData.email,
        first_name: tokenData.first_name,
        last_name: tokenData.last_name,
        phone_e164: tokenData.phone_e164,
        age_years: tokenData.age_years,
        handicap: tokenData.handicap,
        role: 'PLAYER'
      });

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Don't fail the request for profile errors, just log them
    }

    // Mark the token as used
    await supabaseAdmin
      .from('magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', token);

    // Generate an access token for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: tokenData.email,
    });

    if (sessionError) {
      console.error("Error generating session:", sessionError);
      throw new Error("Failed to create user session");
    }

    console.log("Magic link verification successful for user:", user.id);

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: tokenData.first_name,
        last_name: tokenData.last_name
      },
      competition_url: tokenData.competition_url,
      access_token: sessionData.properties?.access_token,
      refresh_token: sessionData.properties?.refresh_token
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in verify-magic-link function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to verify magic link" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);