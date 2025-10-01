import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createBrandedEmailTemplate } from "../_shared/email-template.ts";

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
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://demo.holein1challenge.co.uk';

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

    // Use domain URL for confirmation link
    const confirmUrl = `${appBaseUrl}/functions/v1/confirm-witness?id=${verificationId}&token=${token}`;

    const playerName = verification.entry?.player?.first_name 
      ? `${verification.entry.player.first_name} ${verification.entry.player.last_name || ''}`
      : 'A golfer';

    // Create branded email using template
    const emailHtml = createBrandedEmailTemplate({
      preheader: `Please confirm you witnessed ${playerName}'s hole-in-one`,
      heading: 'Witness Confirmation Request',
      body: `
        <p>Hi <strong>${witnessName}</strong>,</p>
        
        <p>You've been listed as a witness for a hole-in-one claim at OHIO Golf!</p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #C7A24C; padding: 15px 20px; margin: 20px 0;">
          <strong style="color: #0F3D2E;">Claim Details:</strong><br>
          <strong>Player:</strong> ${playerName}<br>
          <strong>Competition:</strong> ${verification.entry?.competition?.name}<br>
          <strong>Club:</strong> ${verification.entry?.competition?.club?.name}<br>
          <strong>Hole:</strong> ${verification.entry?.competition?.hole_number}
        </div>
        
        <p>We need you to confirm that you witnessed this amazing shot. This is a quick one-click process and should only take a moment.</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          <strong>Important:</strong> This confirmation link expires in <strong>48 hours</strong>. 
          Please confirm as soon as possible to avoid delays in processing this claim.
        </p>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 20px 0;">
          <strong style="color: #0F3D2E;">Why am I receiving this?</strong><br>
          The player listed you as a witness for their hole-in-one claim. Your confirmation helps us verify the authenticity of this achievement.
        </div>
      `,
      ctaText: '✓ Yes, I Witnessed This Shot',
      ctaUrl: confirmUrl,
      includeSecurityNote: true
    });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'OHIO Golf <claims@demo.holein1challenge.co.uk>',
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