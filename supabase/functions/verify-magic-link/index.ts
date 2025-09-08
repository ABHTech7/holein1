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
    
    console.log("Verifying magic link token:", token);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Supabase client initialized successfully");

    // Look up the magic link token with detailed error handling
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('magic_link_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token not found:", tokenError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Invalid magic link - token not found" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if token is already used
    if (tokenData.used) {
      console.error("Token already used:", token);
      return new Response(JSON.stringify({ 
        success: false,
        error: "This magic link has already been used. Please request a new one." 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    console.log("Checking token expiration:");
    console.log("Current time (UTC):", now.toISOString());
    console.log("Token expires at (UTC):", expiresAt.toISOString());
    
    if (expiresAt <= now) {
      console.error("Token expired:", token);
      return new Response(JSON.stringify({ 
        success: false,
        error: "This magic link has expired. Please request a new one." 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    console.log("Token validation successful. Token is still valid.");

    // Try to create the user - if they already exist, we'll get them back
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
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

    let user;
    if (createError) {
      // If user already exists, try to get them
      if (createError.message.includes('already registered')) {
        console.log("User already exists, fetching existing user");
        
        // Get existing user by listing users with email filter
        const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000 // Should be enough for most cases
        });
        
        if (listError) {
          console.error("Error listing users:", listError);
          throw new Error("Failed to verify existing user");
        }
        
        const existingUser = userList.users.find(u => u.email === tokenData.email);
        if (!existingUser) {
          console.error("User should exist but not found in list");
          throw new Error("Failed to find existing user");
        }
        
        user = existingUser;
        console.log("Existing user found:", user.id);
      } else {
        console.error("Error creating user:", createError);
        throw new Error("Failed to create user account");
      }
    } else {
      // New user created successfully
      if (!userData.user) {
        console.error("User creation succeeded but no user returned");
        throw new Error("Failed to create user account");
      }
      
      user = userData.user;
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
    const { error: markUsedError } = await supabaseAdmin
      .from('magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', token);

    if (markUsedError) {
      console.error("Error marking token as used:", markUsedError);
      // Don't fail the request for this, just log it
    }

    // Generate proper access and refresh tokens for the user
    console.log("Generating access token for user:", user.id);
    
    const { data: tokenResponse, error: tokenError } = await supabaseAdmin.auth.admin.generateAccessToken(user.id);

    if (tokenError) {
      console.error("Error generating access token:", tokenError);
      throw new Error("Failed to create user session");
    }

    if (!tokenResponse?.access_token) {
      console.error("No access token returned from generateAccessToken");
      throw new Error("Failed to generate valid access token");
    }

    console.log("Magic link verification successful for user:", user.id);
    console.log("Access token generated successfully");

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: tokenData.first_name,
        last_name: tokenData.last_name
      },
      competition_url: tokenData.competition_url,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in verify-magic-link function:", error);
    console.error("Error stack:", error.stack);
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