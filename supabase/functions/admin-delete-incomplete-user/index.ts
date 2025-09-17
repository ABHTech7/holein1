import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  user_id: string;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request
    const { user_id, reason = 'Admin initiated deletion' }: DeleteUserRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-delete-incomplete-user] Processing deletion request for user:', user_id);

    // Get JWT from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is admin using the regular client (not service role)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user: callingUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !callingUser) {
      console.error('[admin-delete-incomplete-user] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', callingUser.id)
      .single();

    if (profileError || callerProfile?.role !== 'ADMIN') {
      console.error('[admin-delete-incomplete-user] Unauthorized access attempt by user:', callingUser.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-delete-incomplete-user] Admin verified:', callingUser.id);

    // Use service role to check if user is deletable
    const { data: incompleteUsers, error: incompleteError } = await supabaseAdmin
      .rpc('get_incomplete_players');

    if (incompleteError) {
      console.error('[admin-delete-incomplete-user] Error fetching incomplete players:', incompleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user deletion eligibility' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUser = incompleteUsers?.find((user: any) => user.id === user_id);
    if (!targetUser) {
      console.warn('[admin-delete-incomplete-user] User not found in incomplete players list:', user_id);
      return new Response(
        JSON.stringify({ 
          error: 'User cannot be deleted',
          reason: 'User has successful payments or completed entries, or is not found'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-delete-incomplete-user] User is eligible for deletion:', user_id);

    // Check feature flag for soft vs hard delete
    const softDelete = Deno.env.get('VITE_SOFT_DELETE_PLAYERS') !== 'false';
    console.log('[admin-delete-incomplete-user] Soft delete mode:', softDelete);

    // Perform deletion in transaction
    const { error: transactionError } = await supabaseAdmin.rpc('begin');
    
    try {
      if (softDelete) {
        // Soft delete: update profile status
        const { error: softDeleteError } = await supabaseAdmin
          .from('profiles')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString()
          })
          .eq('id', user_id);

        if (softDeleteError) throw softDeleteError;
        console.log('[admin-delete-incomplete-user] Soft deleted profile:', user_id);
      } else {
        // Hard delete: remove related data and auth user
        
        // Delete related entries (only pending/unpaid)
        const { error: entriesError } = await supabaseAdmin
          .from('entries')
          .delete()
          .eq('player_id', user_id)
          .in('status', ['pending', 'unpaid', 'abandoned']);

        if (entriesError) {
          console.warn('[admin-delete-incomplete-user] Error deleting entries:', entriesError);
          // Continue - this is not critical
        }

        // Delete other related data
        const tablesToClean = ['verifications', 'uploaded_files'];
        for (const table of tablesToClean) {
          const { error } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('user_id', user_id);
          
          if (error) {
            console.warn(`[admin-delete-incomplete-user] Error deleting from ${table}:`, error);
            // Continue - not critical
          }
        }

        // Delete profile
        const { error: profileDeleteError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', user_id);

        if (profileDeleteError) throw profileDeleteError;
        
        // Delete auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (authDeleteError) throw authDeleteError;
        
        console.log('[admin-delete-incomplete-user] Hard deleted user and all data:', user_id);
      }

      // Insert audit log
      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          actor_id: callingUser.id,
          target_user_id: user_id,
          action: softDelete ? 'admin_soft_delete_incomplete_user' : 'admin_delete_incomplete_user',
          reason,
          metadata: {
            deletion_type: softDelete ? 'soft' : 'hard',
            target_email: targetUser.email,
            has_success_payment: targetUser.has_success_payment,
            has_paid_entry: targetUser.has_paid_entry,
            onboarding_complete: targetUser.onboarding_complete
          }
        });

      if (auditError) {
        console.error('[admin-delete-incomplete-user] Audit log error:', auditError);
        // Don't fail the deletion for audit log issues
      }

      // Commit transaction
      await supabaseAdmin.rpc('commit');

      console.log('[admin-delete-incomplete-user] Successfully deleted user:', user_id);

      return new Response(
        JSON.stringify({ 
          success: true,
          deletion_type: softDelete ? 'soft' : 'hard',
          user_id,
          message: `User ${softDelete ? 'soft' : 'hard'} deleted successfully`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      // Rollback transaction
      await supabaseAdmin.rpc('rollback');
      throw error;
    }

  } catch (error: any) {
    console.error('[admin-delete-incomplete-user] Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});