import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FindUserRequest {
  email: string;
  repair?: boolean;
  defaultRole?: 'ADMIN' | 'SUPER_ADMIN' | 'CLUB' | 'INSURANCE_PARTNER';
  firstName?: string;
  lastName?: string;
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const { email, repair, defaultRole = 'ADMIN', firstName, lastName }: FindUserRequest = await req.json();
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return new Response(JSON.stringify({ success: false, error: 'Valid email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
      }
    );

    // Authenticate caller
    const { data: authData, error: authErr } = await supabaseClient.auth.getUser();
    if (authErr || !authData?.user) {
      console.error('admin-find-user: auth failed', authErr);
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Authorize: ADMIN or SUPER_ADMIN only
    const { data: callerProfile, error: callerErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (callerErr || !callerProfile || !['ADMIN', 'SUPER_ADMIN'].includes(callerProfile.role)) {
      console.error('admin-find-user: unauthorized', callerErr);
      return new Response(JSON.stringify({ success: false, error: 'Not authorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Look up in Auth
    const { data: userByEmail, error: getByEmailErr } = await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail);
    if (getByEmailErr && getByEmailErr.message && !getByEmailErr.message.includes('No user found')) {
      console.warn('admin-find-user: getUserByEmail warning', getByEmailErr);
    }

    const authUser = userByEmail?.user ?? null;

    // Look up in Profiles (case-insensitive)
    const { data: profilesMatch, error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .ilike('email', normalizedEmail)
      .limit(10);

    if (profilesErr) {
      console.error('admin-find-user: profiles query error', profilesErr);
    }

    // Choose best profile candidate
    let profile = null as any;
    if (profilesMatch && profilesMatch.length > 0) {
      if (authUser) {
        profile = profilesMatch.find((p: any) => p.id === authUser.id) ?? profilesMatch[0];
      } else {
        profile = profilesMatch[0];
      }
    }

    const existsInAuth = !!authUser;
    const existsInProfiles = !!profile;
    const profileStatus = profile?.status ?? null;
    const profileRole = profile?.role ?? null;
    const isDeleted = profileStatus === 'deleted' || !!profile?.deleted_at;

    let recommendedAction: 'none' | 'create_profile' | 'reactivate_profile' = 'none';
    if (existsInAuth && !existsInProfiles) recommendedAction = 'create_profile';
    else if (existsInAuth && existsInProfiles && isDeleted) recommendedAction = 'reactivate_profile';

    let actionTaken: string | null = null;

    if (repair) {
      if (!existsInAuth) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Cannot repair: user does not exist in auth.users',
          diagnostics: { existsInAuth, existsInProfiles },
        }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      if (recommendedAction === 'create_profile') {
        const upsertPayload: any = {
          id: authUser.id,
          email: normalizedEmail,
          first_name: firstName ?? authUser.user_metadata?.first_name ?? '',
          last_name: lastName ?? authUser.user_metadata?.last_name ?? '',
          role: defaultRole,
          status: 'active',
          updated_at: new Date().toISOString(),
        };
        const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert(upsertPayload);
        if (upsertErr) {
          console.error('admin-find-user: profile upsert failed', upsertErr);
          return new Response(JSON.stringify({ success: false, error: 'Profile upsert failed', details: upsertErr.message }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
        actionTaken = 'created_profile';
      } else if (recommendedAction === 'reactivate_profile') {
        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', profile.id);
        if (updateErr) {
          console.error('admin-find-user: profile reactivate failed', updateErr);
          return new Response(JSON.stringify({ success: false, error: 'Profile reactivate failed', details: updateErr.message }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
        actionTaken = 'reactivated_profile';
      }
    }

    const resp = {
      success: true,
      diagnostics: {
        email: normalizedEmail,
        existsInAuth,
        existsInProfiles,
        authUserId: authUser?.id ?? null,
        profileId: profile?.id ?? null,
        profileRole,
        profileStatus,
        recommendedAction,
      },
      actionTaken,
    };

    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    console.error('admin-find-user: unexpected error', e);
    return new Response(JSON.stringify({ success: false, error: 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});