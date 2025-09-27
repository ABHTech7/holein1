import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateClubUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  clubId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client for authentication check (using user's JWT)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Admin client for user creation (using service role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set the auth header for the client
    supabaseClient.auth.setAuth(authHeader.replace('Bearer ', ''));

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if the user has admin privileges
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      console.error('Authorization error:', profileError, profile);
      return new Response(JSON.stringify({ error: 'Access denied - admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { email, password, firstName, lastName, clubId }: CreateClubUserRequest = await req.json();

    if (!email || !password || !firstName || !clubId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the club exists
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('id, name')
      .eq('id', clubId)
      .single();

    if (clubError || !club) {
      console.error('Club not found:', clubError);
      return new Response(JSON.stringify({ error: 'Club not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create the user using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName || '',
        role: 'CLUB',
        club_id: clubId
      },
      email_confirm: true // Auto-confirm email
    });

    if (createError) {
      console.error('User creation error:', createError);
      return new Response(JSON.stringify({ 
        error: createError.message || 'Failed to create user' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!newUser.user) {
      return new Response(JSON.stringify({ error: 'User creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the profile with club_id and role (redundant but safe)
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        club_id: clubId, 
        role: 'CLUB',
        first_name: firstName,
        last_name: lastName || '',
        email: email.toLowerCase().trim()
      })
      .eq('id', newUser.user.id);

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
      // Don't fail the request, just log the error
    }

    console.log(`Successfully created club user: ${email} for club: ${club.name}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Club manager created successfully for ${club.name}`,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        club_name: club.name
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Unexpected error in admin-create-club-user:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);