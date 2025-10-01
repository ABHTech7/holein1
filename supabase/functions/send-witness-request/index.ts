import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verificationId, witnessEmail, witnessName } = await req.json();
    
    if (!verificationId || !witnessEmail || !witnessName) {
      throw new Error('verificationId, witnessEmail, and witnessName are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://srnbylbbsdckkwatfqjg.supabase.co';

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: true, message: 'Email skipped (no API key)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch verification details
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .select(`
        id,
        entry:entries(
          id,
          player:profiles(first_name, last_name),
          competition:competitions(
            name,
            hole_number,
            club:clubs(name)
          )
        )
      `)
      .eq('id', verificationId)
      .single();

    if (verificationError || !verification) {
      throw new Error('Verification not found');
    }

    // Generate secure confirmation token
    const token = crypto.randomUUID();
    
    // Store witness confirmation record
    const { error: confirmError } = await supabase
      .from('witness_confirmations')
      .insert({
        verification_id: verificationId,
        token,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      });

    if (confirmError) {
      console.error('Failed to create witness confirmation:', confirmError);
      throw new Error('Failed to create witness confirmation');
    }

    const confirmUrl = `${appBaseUrl}/functions/v1/confirm-witness?id=${verificationId}&token=${token}`;

    // Send witness confirmation email using Resend
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 40px 20px; text-align: center; }
            .logo { width: 120px; height: auto; margin-bottom: 20px; }
            .content { padding: 40px 20px; }
            .button { display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 30px 0; font-size: 16px; }
            .info-box { background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
            .footer { background-color: #f9fafb; padding: 30px 20px; text-align: center; color: #6b7280; font-size: 14px; }
            h1 { color: #ffffff; margin: 0; font-size: 28px; }
            h2 { color: #111827; margin: 0 0 20px; font-size: 24px; }
            p { color: #374151; line-height: 1.6; margin: 15px 0; }
            .highlight { background-color: #fef3c7; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${appBaseUrl}/brand/ohio-logo-white.svg" alt="OHIO Golf" class="logo" />
              <h1>🏌️ Witness Confirmation Request</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${witnessName},</h2>
              
              <p>You've been listed as a witness for a hole-in-one claim at OHIO Golf!</p>
              
              <div class="info-box">
                <strong>Claim Details:</strong><br>
                Player: ${verification.entry?.player?.first_name} ${verification.entry?.player?.last_name}<br>
                Competition: ${verification.entry?.competition?.name}<br>
                Club: ${verification.entry?.competition?.club?.name}<br>
                Hole: ${verification.entry?.competition?.hole_number}
              </div>
              
              <p>We need you to confirm that you witnessed this amazing shot. This is a quick one-click process and should only take a moment.</p>
              
              <div style="text-align: center;">
                <a href="${confirmUrl}" class="button">
                  ✓ Yes, I Witnessed This Shot
                </a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                <strong>Important:</strong> This confirmation link expires in <span class="highlight">48 hours</span>. 
                Please confirm as soon as possible to avoid delays in processing this claim.
              </p>
              
              <div class="info-box" style="border-left-color: #3b82f6; background-color: #eff6ff;">
                <strong>Why am I receiving this?</strong><br>
                The player listed you as a witness for their hole-in-one claim. Your confirmation helps us verify the authenticity of this achievement.
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Questions?</strong> Contact us at support@holein1.test</p>
              <p style="margin-top: 20px; color: #9ca3af; font-size: 12px;">
                If you did not witness this shot or believe you've received this email in error, please contact us immediately.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'OHIO Golf <claims@holein1.test>',
        to: witnessEmail,
        subject: `Witness Confirmation: Hole-in-One at ${verification.entry?.competition?.club?.name}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Email send failed: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log('Witness email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ success: true, token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
