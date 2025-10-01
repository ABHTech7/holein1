import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verificationId, witnessEmail, witnessName } = await req.json();

    if (!verificationId || !witnessEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch verification and related data
    const { data: verification, error: fetchError } = await supabase
      .from('verifications')
      .select(`
        id,
        entry:entries (
          id,
          player:profiles (
            first_name,
            last_name,
            email
          ),
          competition:competitions (
            name,
            hole_number,
            club:clubs (
              name
            )
          )
        )
      `)
      .eq('id', verificationId)
      .single();

    if (fetchError || !verification) {
      console.error('Verification fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Verification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new confirmation token
    const newToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours from now

    // Insert new witness confirmation record
    const { error: insertError } = await supabase
      .from('witness_confirmations')
      .insert({
        verification_id: verificationId,
        token: newToken,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Witness confirmation insert error:', insertError);
      throw insertError;
    }

    // Generate confirmation URL
    const confirmationUrl = `${supabaseUrl.replace('.supabase.co', '')}.supabase.co/functions/v1/confirm-witness?token=${newToken}`;

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Compose email
    const playerName = verification.entry?.player?.first_name 
      ? `${verification.entry.player.first_name} ${verification.entry.player.last_name || ''}`
      : verification.entry?.player?.email || 'A golfer';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏌️ Witness Confirmation Request (Resent)</h1>
            </div>
            
            <div class="content">
              <p>Hello ${witnessName || 'there'},</p>
              
              <p>This is a resent request to confirm that you witnessed a hole-in-one by <strong>${playerName}</strong>.</p>
              
              <div class="details">
                <h3>Claim Details:</h3>
                <p><strong>Player:</strong> ${playerName}</p>
                <p><strong>Competition:</strong> ${verification.entry?.competition?.name}</p>
                <p><strong>Club:</strong> ${verification.entry?.competition?.club?.name}</p>
                <p><strong>Hole:</strong> ${verification.entry?.competition?.hole_number}</p>
              </div>
              
              <p>To confirm you witnessed this incredible shot, please click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">✅ Confirm Witness</a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">This confirmation link will expire in 48 hours.</p>
            </div>
            
            <div class="footer">
              <p><strong>Questions?</strong> Contact us at support@demo.holein1challenge.co.uk</p>
              <p style="margin-top: 20px; color: #9ca3af; font-size: 12px;">
                If you did not witness this shot or believe you've received this email in error, please contact us immediately.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'OHIO Golf <claims@demo.holein1challenge.co.uk>',
        to: witnessEmail,
        subject: `[RESENT] Witness Confirmation: Hole-in-One at ${verification.entry?.competition?.club?.name}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await resendResponse.json();
    console.log('Witness email resent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        token: newToken,
        verificationId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in resend-witness-request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
