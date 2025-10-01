import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createBrandedEmailTemplate } from "../_shared/email-template.ts";

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
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://demo.holein1challenge.co.uk';
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

    // Use domain URL for confirmation link
    const confirmationUrl = `${appBaseUrl}/functions/v1/confirm-witness?id=${verificationId}&token=${newToken}`;

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Compose email
    const playerName = verification.entry?.player?.first_name 
      ? `${verification.entry.player.first_name} ${verification.entry.player.last_name || ''}`
      : verification.entry?.player?.email || 'A golfer';

    // Create branded email using template
    const emailHtml = createBrandedEmailTemplate({
      preheader: `Reminder: Please confirm you witnessed ${playerName}'s hole-in-one`,
      heading: 'Witness Confirmation (Resent)',
      body: `
        <p>Hello <strong>${witnessName || 'there'}</strong>,</p>
        
        <p>This is a resent request to confirm that you witnessed a hole-in-one by <strong>${playerName}</strong>.</p>
        
        <div style="background-color: #f8f9fa; border-left: 4px solid #C7A24C; padding: 15px 20px; margin: 20px 0;">
          <strong style="color: #0F3D2E;">Claim Details:</strong><br>
          <strong>Player:</strong> ${playerName}<br>
          <strong>Competition:</strong> ${verification.entry?.competition?.name}<br>
          <strong>Club:</strong> ${verification.entry?.competition?.club?.name}<br>
          <strong>Hole:</strong> ${verification.entry?.competition?.hole_number}
        </div>
        
        <p>To confirm you witnessed this incredible shot, please click the button below:</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          <strong>Important:</strong> This confirmation link expires in <strong>48 hours</strong>.
        </p>
      `,
      ctaText: '✅ Confirm Witness',
      ctaUrl: confirmationUrl,
      includeSecurityNote: true
    });

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