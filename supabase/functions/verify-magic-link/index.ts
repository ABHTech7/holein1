import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyMagicLinkRequest {
  token: string;
}

// Helper function to find user by email using paginated listUsers
async function findUserByEmail(supabaseAdmin: any, email: string, traceId: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const maxPages = 10; // Scan up to 10,000 users
  let page = 1;
  
  console.log(`[${traceId}] Starting paginated search for:`, normalizedEmail);
  
  while (page <= maxPages) {
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000
    });
    
    if (listError) {
      console.error(`[${traceId}] listUsers error on page ${page}:`, listError);
      return { user: null, error: listError };
    }
    
    if (!usersData.users || usersData.users.length === 0) {
      console.log(`[${traceId}] No more users on page ${page}, search complete`);
      return { user: null, error: null };
    }
    
    // Search current page for matching email
    const foundUser = usersData.users.find(
      (u: any) => u.email?.toLowerCase().trim() === normalizedEmail
    );
    
    if (foundUser) {
      console.log(`[${traceId}] Found user on page ${page}:`, foundUser.id);
      return { user: foundUser, error: null };
    }
    
    // If page has fewer results than perPage, we've reached the last page
    if (usersData.users.length < 1000) {
      console.log(`[${traceId}] Reached last page (${page}), user not found`);
      return { user: null, error: null };
    }
    
    page++;
  }
  
  console.warn(`[${traceId}] Hit max pages limit (${maxPages}), user not found - consider increasing limit`);
  return { user: null, error: null };
}

const handler = async (req: Request): Promise<Response> => {
  // Generate trace ID for this invocation
  const traceId = crypto.randomUUID().slice(0, 8);
  console.log(`[${traceId}] Magic link verification request received:`, req.method);

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
    
    console.log(`[${traceId}] Verifying magic link token:`, token);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`[${traceId}] Supabase client initialized successfully`);

    // Look up the magic link token with detailed error handling
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('magic_link_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error(`[${traceId}] Token not found:`, tokenError);
      return new Response(JSON.stringify({ 
        success: false,
        code: 'token_not_found',
        error: "Invalid magic link - token not found" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Normalize email to lowercase
    const normalizedEmail = tokenData.email.toLowerCase().trim();

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    console.log(`[${traceId}] Checking token expiration:`, {
      current: now.toISOString(),
      expires: expiresAt.toISOString()
    });
    
    // Check expiration first - if expired, token is truly unusable
    if (expiresAt <= now) {
      console.error(`[${traceId}] Token expired:`, token);
      return new Response(JSON.stringify({ 
        success: false,
        code: 'token_expired',
        error: "This magic link has expired. Please request a new one." 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Token is still valid - allow reuse within the 6-hour window
    if (tokenData.used) {
      console.log(`[${traceId}] Token previously used but still within validity window, allowing reuse`);
    }
    
    console.log(`[${traceId}] Token validation successful`);

    // Check if user already exists using profiles table lookup (normalized email)
    const { data: existingProfile, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    let user;
    
    if (queryError && !queryError.message.includes('No rows found')) {
      console.error(`[${traceId}] Error checking for existing user:`, queryError);
      return new Response(JSON.stringify({ 
        success: false,
        code: 'profile_lookup_failed',
        message: "Failed to verify user status"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (existingProfile) {
      // Profile exists, try to get the corresponding auth user
      console.log(`[${traceId}] Profile exists, fetching corresponding auth user`);
      
      const { data: existingUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
      
      if (getUserError || !existingUserData.user) {
        console.log(`[${traceId}] Auth user not found for existing profile, checking via listUsers`);
        
        // Search for auth user using listUsers
        const { user: foundAuthUser, error: findError } = await findUserByEmail(supabaseAdmin, normalizedEmail, traceId);
        
        if (foundAuthUser) {
          console.log(`[${traceId}] Found auth user via listUsers, orphaned profile detected:`, foundAuthUser.id);
          
          // Delete the orphaned profile
          await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', existingProfile.id);
          
          console.log(`[${traceId}] Orphaned profile deleted, will upsert with correct user.id`);
          user = foundAuthUser;
          
        } else {
          console.log(`[${traceId}] No auth user found, creating new user`);
          
          // Create a completely fresh new user
          const { data: freshUserData, error: freshUserError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
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
            console.error(`[${traceId}] Failed to create fresh user:`, freshUserError);
            return new Response(JSON.stringify({ 
              success: false,
              code: 'user_creation_failed',
              message: "Failed to create user account after orphaned profile cleanup",
              traceId
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          
          user = freshUserData.user;
          console.log(`[${traceId}] Fresh user created after cleanup:`, user.id);
        }
      } else {
        user = existingUserData.user;
        console.log(`[${traceId}] Existing user found:`, user.id);
      }
      
    } else {
      // No profile exists, check if auth user exists using listUsers
      console.log(`[${traceId}] No profile found, searching auth users for:`, normalizedEmail);
      
      const { user: foundAuthUser, error: findError } = await findUserByEmail(supabaseAdmin, normalizedEmail, traceId);
      
      if (foundAuthUser) {
        // Auth user exists without profile - use existing user
        console.log(`[${traceId}] Found existing auth user without profile:`, foundAuthUser.id);
        user = foundAuthUser;
        
      } else {
        // No auth user found, create new user
        console.log(`[${traceId}] No auth user found, creating new user`);
        
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
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

        if (createError) {
          console.error(`[${traceId}] Error creating user:`, createError);
          
          // Handle email_exists error with listUsers fallback
          if (createError.message?.includes('already been registered') || createError.code === 'email_exists') {
            console.log(`[${traceId}] email_exists fallback: using listUsers to recover`);
            
            const { user: retryFoundUser, error: retryError } = await findUserByEmail(supabaseAdmin, normalizedEmail, traceId);
            
            if (!retryFoundUser || retryError) {
              console.error(`[${traceId}] listUsers failed after email_exists:`, retryError);
              return new Response(JSON.stringify({ 
                success: false,
                code: 'auth_user_missing',
                message: "Auth user exists but could not be retrieved. Please contact support.",
                details: "listUsers returned no user after email_exists error",
                traceId
              }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }
            
            user = retryFoundUser;
            console.log(`[${traceId}] Successfully recovered existing user via listUsers:`, user.id);
            
          } else {
            return new Response(JSON.stringify({ 
              success: false,
              code: 'user_creation_failed',
              message: "Failed to create user account",
              details: createError.message,
              traceId
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          
        } else if (!userData.user) {
          return new Response(JSON.stringify({ 
            success: false,
            code: 'user_creation_failed',
            message: "Failed to create user account",
            traceId
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
          
        } else {
          user = userData.user;
          console.log(`[${traceId}] New user created:`, user.id);
        }
      }
    }

    // Update user profile with normalized email
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: normalizedEmail,
        first_name: tokenData.first_name,
        last_name: tokenData.last_name,
        phone_e164: tokenData.phone_e164,
        age_years: tokenData.age_years,
        handicap: tokenData.handicap,
        role: 'PLAYER'
      });

    if (profileError) {
      console.error(`[${traceId}] Error updating profile:`, profileError);
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
    
    // Check for existing entry for this user and competition
    const { data: existingEntry, error: existingEntryError } = await supabaseAdmin
      .from('entries')
      .select('id, status, outcome_self')
      .eq('player_id', user.id)
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingEntryError && !existingEntryError.message.includes('No rows found')) {
      console.error("Error checking for existing entry:", existingEntryError);
      throw new Error("Failed to check existing entries");
    }

    let entryId: string;

    if (existingEntry) {
      // Use existing entry
      entryId = existingEntry.id;
      console.log("Found existing entry:", entryId, "with status:", existingEntry.status);
      
      // Don't mark token as used - allow continued access until outcome is selected
      if (!existingEntry.outcome_self) {
        console.log("Entry outcome not yet selected, allowing continued access");
      }
    } else {
      // Create new entry for the user
      const entryTime = new Date();
      // Use configurable timeout from environment (default 12 hours if not set)
      const timeoutHours = parseInt(Deno.env.get("VITE_VERIFICATION_TIMEOUT_HOURS") || "12");
      const attemptWindowEnd = new Date(entryTime.getTime() + timeoutHours * 60 * 60 * 1000);
      
      console.log("Creating new entry for user:", user.id, "competition:", competitionId);
      
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
        
        // Handle specific cooldown error more gracefully
        if (entryError.message?.includes("Players must wait 12 hours")) {
          console.log("Cooldown period active - still authenticating user but no new entry");
          
          // Generate action link for authentication to existing entries
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: tokenData.email,
            options: {
              redirectTo: `${(() => {
                try {
                  return new URL(competitionUrl).origin;
                } catch {
                  return Deno.env.get('SITE_URL') || '';
                }
              })()}/auth/callback?email=${encodeURIComponent(tokenData.email)}&continue=${encodeURIComponent('/players/entries')}`
            }
          });

          if (linkError) {
            console.error("Error generating action link for cooldown user:", linkError);
            return new Response(JSON.stringify({ 
              success: false,
              error: "Authentication link generation failed"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          return new Response(JSON.stringify({ 
            success: true,
            cooldown_active: true,
            message: "You've already entered this competition recently. Please wait 12 hours between entries.",
            // @ts-ignore - properties type differs in Deno env typings
            action_link: linkData?.properties?.action_link || linkData?.action_link,
            redirect_url: '/players/entries',
            user: {
              id: user.id,
              email: user.email,
              first_name: tokenData.first_name,
              last_name: tokenData.last_name,
              role: 'PLAYER'
            }
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        throw new Error("Failed to create competition entry");
      }
      
      entryId = entry.id;
      console.log("Entry created successfully:", entryId);
    }

    // Only mark token as used if the entry outcome has been selected
    // This allows multiple clicks until the player makes their choice
    const shouldMarkUsed = existingEntry && existingEntry.outcome_self;
    
    if (shouldMarkUsed) {
      console.log("Entry outcome already selected, marking token as used");
      const { error: markUsedError } = await supabaseAdmin
        .from('magic_link_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token);

      if (markUsedError) {
        console.error("Error marking token as used:", markUsedError);
        // Don't fail the request for this, just log it
      }
    } else {
      console.log("Entry outcome not yet selected, keeping token available for reuse");
    }

    console.log("Magic link verification successful for user:", user.id);

    // Generate a Supabase action link to establish a real session in the browser
    const baseUrl = (() => {
      try {
        return new URL(competitionUrl).origin;
      } catch {
        return Deno.env.get('SITE_URL') || '';
      }
    })();

    let action_link: string | undefined = undefined;
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: tokenData.email,
        options: {
          redirectTo: `${baseUrl}/auth/callback?email=${encodeURIComponent(tokenData.email)}&continue=${encodeURIComponent(`/entry/${entryId}/confirmation`)}`
        }
      });
      if (linkError) {
        console.error('Error generating action link:', linkError);
      } else {
        // @ts-ignore - properties type differs in Deno env typings
        action_link = linkData?.properties?.action_link || linkData?.action_link;
      }
    } catch (e) {
      console.error('Exception while generating action link:', e);
    }

    // Return redirect URL and optional action link to complete auth
    const responseData = { 
      success: true,
      redirect_url: `/entry/${entryId}/confirmation`,
      action_link,
      user: {
        id: user.id,
        email: user.email,
        first_name: tokenData.first_name,
        last_name: tokenData.last_name,
        role: 'PLAYER'
      },
      entry_id: entryId,
      competition_url: tokenData.competition_url
    };
    
    console.log("Success response data:", JSON.stringify(responseData, null, 2));
    
    return new Response(JSON.stringify(responseData), {
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