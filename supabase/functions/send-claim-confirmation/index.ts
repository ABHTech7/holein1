import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimConfirmationRequest {
  verificationId: string;
  entryId: string;
  playerId: string;
  competitionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Claim confirmation email request received:", req.method);

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
    const { verificationId, entryId } = await req.json();
    
    if (!entryId) {
      throw new Error('entryId is required');
    }

    console.log("Processing claim confirmation for:", { verificationId, entryId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL');

    // ✅ FIX: Require APP_BASE_URL for proper web app links
    if (!appBaseUrl) {
      console.error('APP_BASE_URL not configured - email links will not work correctly');
      console.warn('Please set APP_BASE_URL secret to your web app domain (e.g., https://demo.holein1challenge.co.uk)');
    }

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: true, message: 'Email skipped (no API key)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use APP_BASE_URL for web app links, fallback to supabaseUrl for asset links
    const webAppUrl = appBaseUrl || supabaseUrl;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch entry details
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select(`
        id,
        player:profiles(first_name, last_name, email),
        competition:competitions(
          name,
          prize_pool,
          hole_number,
          club:clubs(name)
        )
      `)
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      throw new Error('Entry not found');
    }

    // Fetch verification to get claim ref (last 8 of verification ID)
    const { data: verification } = await supabase
      .from('verifications')
      .select('id')
      .eq('entry_id', entryId)
      .single();

    const claimRef = verification?.id ? verification.id.slice(-8).toUpperCase() : 'PENDING';
    const playerEmail = entry.player?.email;
    if (!playerEmail) {
      throw new Error('Player email not found');
    }

    // Send player confirmation email
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
            .claim-ref { background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
            .claim-ref-label { color: #065f46; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
            .claim-ref-code { color: #065f46; font-size: 32px; font-weight: bold; letter-spacing: 2px; }
            .info-box { background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
            .footer { background-color: #f9fafb; padding: 30px 20px; text-align: center; color: #6b7280; font-size: 14px; }
            h1 { color: #ffffff; margin: 0; font-size: 28px; }
            h2 { color: #111827; margin: 0 0 20px; font-size: 24px; }
            p { color: #374151; line-height: 1.6; margin: 15px 0; }
            .button { display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${webAppUrl}/brand/holeinone-logo.png" alt="Official Hole in One" class="logo" />
              <h1>🏆 Claim Submitted Successfully!</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${entry.player?.first_name || 'Golfer'},</h2>
              
              <p>Congratulations on your incredible hole-in-one at <strong>${entry.competition?.club?.name}</strong>!</p>
              
              <div class="claim-ref">
                <div class="claim-ref-label">YOUR CLAIM REFERENCE</div>
                <div class="claim-ref-code">${claimRef}</div>
              </div>
              
              <div class="info-box">
                <strong>Competition Details:</strong><br>
                ${entry.competition?.name}<br>
                Hole ${entry.competition?.hole_number}<br>
                Prize: £${((entry.competition?.prize_pool || 0) / 100).toFixed(2)}
              </div>
              
              <p style="margin-top: 30px;">
                <a href="${webAppUrl}/player/dashboard" class="button">View My Dashboard</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Need help?</strong> Contact us at support@holein1.test</p>
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
        to: playerEmail,
        subject: `🏆 Claim Submitted - Ref: ${claimRef}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Email send failed: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ success: true, claimRef }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error in send-claim-confirmation function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to send claim confirmation email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
