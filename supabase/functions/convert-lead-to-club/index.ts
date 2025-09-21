import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting lead conversion process');
    
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
    
    // Initialize Supabase client with service role key for admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request body
    const { leadId, clubName, adminEmail, metadata = {} } = await req.json();
    
    console.log('Conversion request:', { leadId, clubName, adminEmail, metadata });

    // Validate required fields
    if (!leadId || !clubName || !adminEmail) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: leadId, clubName, and adminEmail are required' 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email format' 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 1: Get and validate the lead
    console.log('Fetching lead:', leadId);
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('source', 'Partnership Application')
      .single();

    if (leadError) {
      console.error('Error fetching lead:', leadError);
      return new Response(
        JSON.stringify({ 
          error: 'Lead not found or not a partnership application',
          details: leadError.message 
        }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (lead.status === 'CONVERTED') {
      return new Response(
        JSON.stringify({ 
          error: 'Lead has already been converted' 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 2: Create the club
    console.log('Creating club:', clubName);
    const { data: club, error: clubError } = await supabaseAdmin
      .from('clubs')
      .insert({
        name: clubName,
        email: adminEmail,
        phone: lead.phone || null,
        address: metadata.address || '',
        website: metadata.website || '',
        active: true,
        archived: false
      })
      .select()
      .single();

    if (clubError) {
      console.error('Error creating club:', clubError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create club',
          details: clubError.message 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Club created successfully:', club.id);

    // Step 3: Check if profile already exists for this email
    console.log('Checking for existing profile:', adminEmail);
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('email', adminEmail)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking existing profile:', profileCheckError);
    }

    let profileId;

    if (existingProfile) {
      // Update existing profile to CLUB role and link to new club
      console.log('Updating existing profile:', existingProfile.id);
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          role: 'CLUB',
          club_id: club.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Error updating existing profile:', updateError);
        // Try to rollback club creation
        await supabaseAdmin.from('clubs').delete().eq('id', club.id);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update existing user profile',
            details: updateError.message 
          }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      profileId = existingProfile.id;
    } else {
      // Create new profile placeholder (will be activated when user signs up)
      console.log('Creating new profile placeholder for:', adminEmail);
      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          email: adminEmail,
          role: 'CLUB',
          club_id: club.id,
          first_name: lead.name.split(' ')[0] || '',
          last_name: lead.name.split(' ').slice(1).join(' ') || '',
          status: 'active'
        })
        .select()
        .single();

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        // Try to rollback club creation
        await supabaseAdmin.from('clubs').delete().eq('id', club.id);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create user profile',
            details: createProfileError.message 
          }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      profileId = newProfile.id;
    }

    // Step 4: Update the lead status to CONVERTED
    console.log('Updating lead status to CONVERTED');
    const { error: leadUpdateError } = await supabaseAdmin
      .from('leads')
      .update({
        status: 'CONVERTED',
        club_id: club.id,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (leadUpdateError) {
      console.error('Error updating lead status:', leadUpdateError);
      // This is not critical, so we'll log but continue
    }

    // Step 5: Create audit log entry
    console.log('Creating audit log entry');
    const { error: auditError } = await supabaseAdmin
      .from('audit_events')
      .insert({
        entity_type: 'lead_conversion',
        entity_id: leadId,
        action: 'CONVERT_TO_CLUB',
        new_values: {
          lead_id: leadId,
          club_id: club.id,
          club_name: clubName,
          admin_email: adminEmail,
          metadata
        },
        user_id: null // System operation
      });

    if (auditError) {
      console.error('Error creating audit log:', auditError);
      // This is not critical, so we'll continue
    }

    console.log('Lead conversion completed successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          leadId,
          clubId: club.id,
          clubName: club.name,
          adminEmail,
          profileId
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error in lead conversion:', error);
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