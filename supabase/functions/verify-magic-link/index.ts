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

    // Check if user already exists using profiles table lookup
    const { data: existingProfile, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', tokenData.email)
      .maybeSingle();

    let user;
    
    if (queryError && !queryError.message.includes('No rows found')) {
      console.error("Error checking for existing user:", queryError);
      throw new Error("Failed to verify user status");
    }

    if (existingProfile) {
      // Profile exists, try to get the corresponding auth user
      console.log("Profile exists, fetching corresponding auth user");
      
      const { data: existingUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
      
      if (getUserError || !existingUserData.user) {
        console.log("Auth user not found for existing profile, this is an orphaned profile");
        console.log("Attempting to create auth user with existing profile ID");
        
        // Try to create auth user with the existing profile ID
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: tokenData.email,
          email_confirm: true,
          user_metadata: {
            first_name: tokenData.first_name,
            last_name: tokenData.last_name,
            phone: tokenData.phone_e164,
            age_years: tokenData.age_years,
            handicap: tokenData.handicap,
            role: 'PLAYER'
          }
        });

        if (createError || !userData.user) {
          console.error("Failed to create auth user for orphaned profile:", createError);
          console.log("Deleting orphaned profile and will create fresh user");
          
          // Delete the orphaned profile
          await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', existingProfile.id);
          
          // Create a completely fresh new user
          console.log("Creating fresh user after orphaned profile cleanup");
          
          const { data: freshUserData, error: freshUserError } = await supabaseAdmin.auth.admin.createUser({
            email: tokenData.email,
            email_confirm: true,
            user_metadata: {
              first_name: tokenData.first_name,
              last_name: tokenData.last_name,
              phone: tokenData.phone_e164,
              age_years: tokenData.age_years,
              handicap: tokenData.handicap,
              role: 'PLAYER'
            }
          });

          if (freshUserError || !freshUserData.user) {
            console.error("Failed to create fresh user:", freshUserError);
            throw new Error("Failed to create fresh user after orphaned profile cleanup");
          }
          
          user = freshUserData.user;
          console.log("Fresh user created after cleanup:", user.id);
        } else {
          user = userData.user;
          console.log("Created auth user for existing profile:", user.id);
        }
      } else {
        user = existingUserData.user;
        console.log("Existing user found:", user.id);
      }
      
    } else {
      // User doesn't exist, create new user
      console.log("Creating new user");
      
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

      if (createError || !userData.user) {
        console.error("Error creating user:", createError);
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

    // Parse competition URL to extract club and competition slugs
    const competitionUrl = tokenData.competition_url;
    console.log("Parsing competition URL:", competitionUrl);
    
    let competitionId = null;
    
    // Handle different URL formats
    if (competitionUrl.includes('/competition/')) {
      // New format: /competition/{clubSlug}/{competitionSlug}
      const urlParts = competitionUrl.split('/');
      
      // URL format: https://domain.com/competition/{clubSlug}/{competitionSlug}
      // urlParts: ['https:', '', 'domain.com', 'competition', 'clubSlug', 'competitionSlug']
      if (urlParts.length < 6) {
        console.error("Invalid competition URL format:", competitionUrl);
        throw new Error("Invalid competition URL format");
      }
      
      const clubSlug = urlParts[4];
      const competitionSlug = urlParts[5];
      
      console.log("Extracted slugs - Club:", clubSlug, "Competition:", competitionSlug);
      
      // Look up competition using slugs - we need to find the club first
      const { data: clubs, error: clubError } = await supabaseAdmin
        .from('clubs')
        .select('id, name')
        .eq('archived', false)
        .eq('active', true);
      
      if (clubError || !clubs) {
        console.error("Error fetching clubs:", clubError);
        throw new Error("Failed to find competition");
      }
      
      // Find club by slug
      const matchingClub = clubs.find(club => {
        const clubSlugGenerated = club.name
          .toLowerCase()
          .trim()
          .replace(/'/g, '')
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return clubSlugGenerated === clubSlug;
      });
      
      if (!matchingClub) {
        console.error("Club not found for slug:", clubSlug);
        throw new Error("Competition not found");
      }
      
      console.log("Found club:", matchingClub.name, matchingClub.id);
      
      // Now find competition by slug and club
      const { data: competitions, error: competitionError } = await supabaseAdmin
        .from('competitions')
        .select('id, name')
        .eq('club_id', matchingClub.id)
        .eq('archived', false)
        .in('status', ['ACTIVE', 'SCHEDULED']);
      
      if (competitionError || !competitions) {
        console.error("Error fetching competitions:", competitionError);
        throw new Error("Failed to find competition");
      }
      
      // Find competition by slug
      const matchingCompetition = competitions.find(comp => {
        const compSlugGenerated = comp.name
          .toLowerCase()
          .trim()
          .replace(/'/g, '')
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return compSlugGenerated === competitionSlug;
      });
      
      if (!matchingCompetition) {
        console.error("Competition not found for slug:", competitionSlug);
        throw new Error("Competition not found");
      }
      
      competitionId = matchingCompetition.id;
      console.log("Found competition:", matchingCompetition.name, competitionId);
      
    } else if (competitionUrl.includes('/enter/')) {
      // Legacy format: extract competition ID directly
      const urlParts = competitionUrl.split('/');
      competitionId = urlParts[urlParts.length - 1];
      console.log("Using legacy competition ID:", competitionId);
    } else {
      console.error("Unknown competition URL format:", competitionUrl);
      throw new Error("Invalid competition URL format");
    }
    
    // Create entry for the user
    const entryTime = new Date();
    const attemptWindowEnd = new Date(entryTime.getTime() + 15 * 60 * 1000); // 15 minutes from now
    
    console.log("Creating entry for user:", user.id, "competition:", competitionId);
    
    const { data: entry, error: entryError } = await supabaseAdmin
      .from('entries')
      .insert({
        competition_id: competitionId,
        player_id: user.id,
        paid: false,
        status: 'pending',
        terms_version: "1.0",
        terms_accepted_at: entryTime.toISOString(),
        attempt_window_start: entryTime.toISOString(),
        attempt_window_end: attemptWindowEnd.toISOString()
      })
      .select('id')
      .single();
    
    if (entryError || !entry) {
      console.error("Error creating entry:", entryError);
      
      // Handle specific cooldown error with better messaging
      if (entryError.message?.includes("Players must wait 12 hours")) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "You must wait 12 hours between entries for the same competition. Please try again later.",
          error_type: "cooldown"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      throw new Error("Failed to create competition entry");
    }
    
    console.log("Entry created successfully:", entry.id);

    // Mark the token as used
    const { error: markUsedError } = await supabaseAdmin
      .from('magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', token);

    if (markUsedError) {
      console.error("Error marking token as used:", markUsedError);
      // Don't fail the request for this, just log it
    }

    console.log("Magic link verification successful for user:", user.id);

    // Create confirmation token for entry access
    const { data: confirmationToken, error: confirmationTokenError } = await supabaseAdmin
      .from('entry_confirmation_tokens')
      .insert({
        entry_id: entry.id,
        magic_token: token,
        user_data: {
          id: user.id,
          email: user.email,
          first_name: tokenData.first_name,
          last_name: tokenData.last_name,
          role: 'PLAYER'
        }
      })
      .select('token')
      .single();

    if (confirmationTokenError || !confirmationToken) {
      console.error("Failed to create confirmation token:", confirmationTokenError);
      // Fallback to old response format if token creation fails
      return new Response(JSON.stringify({ 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          first_name: tokenData.first_name,
          last_name: tokenData.last_name,
          role: 'PLAYER'
        },
        entry_id: entry.id,
        competition_url: tokenData.competition_url
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("Confirmation token created:", confirmationToken.token);

    // Return redirect URL for the new token-based confirmation page
    return new Response(JSON.stringify({ 
      success: true,
      redirect_url: `/entry-confirm?token=${confirmationToken.token}&entry=${entry.id}`,
      user: {
        id: user.id,
        email: user.email,
        first_name: tokenData.first_name,
        last_name: tokenData.last_name,
        role: 'PLAYER'
      },
      entry_id: entry.id,
      competition_url: tokenData.competition_url
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