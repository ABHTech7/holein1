import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a secure random password
function generateSecurePassword(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => charset[byte % charset.length]).join('');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the calling user is SUPER_ADMIN
    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authorization');
    }

    // Check if calling user is SUPER_ADMIN
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.user.id)
      .single();

    if (profile?.role !== 'SUPER_ADMIN') {
      throw new Error('Access denied - Super Admin required');
    }

    const { userId, customPassword } = await req.json();

    if (!userId) {
      throw new Error('Missing required parameter: userId');
    }

    // Generate new password or use custom one
    const newPassword = customPassword || generateSecurePassword(16);

    // Validate password strength if custom
    if (customPassword && customPassword.length < 8) {
      throw new Error('Custom password must be at least 8 characters long');
    }

    // Update user password in auth.users
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      throw new Error(`Failed to update user password: ${updateError.message}`);
    }

    // Get user email for logging
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    // Log the change (without the actual password)
    await supabaseAdmin
      .from('audit_events')
      .insert({
        entity_type: 'user_password_reset',
        entity_id: userId,
        action: 'UPDATE',
        new_values: { 
          password_reset: true,
          user_email: userProfile?.email,
          custom_password_used: !!customPassword
        },
        user_id: user.user.id
      });

    console.log(`Successfully reset password for user ${userId} (${userProfile?.email})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User password reset successfully',
        userId,
        newPassword: newPassword, // Return the password so admin can share it
        userEmail: userProfile?.email
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error resetting user password:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});