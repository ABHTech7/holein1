import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';
import { generateEmailTemplate } from '../_shared/email-template.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimRejectionRequest {
  verificationId: string;
  entryId: string;
  rejectionReason: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verificationId, entryId, rejectionReason }: ClaimRejectionRequest = await req.json();

    console.log('Processing claim rejection email for:', { verificationId, entryId });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch verification, entry, player, and competition details
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (verificationError || !verification) {
      throw new Error(`Verification not found: ${verificationError?.message}`);
    }

    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select(`
        *,
        competition:competitions(
          name,
          club:clubs(name)
        )
      `)
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      throw new Error(`Entry not found: ${entryError?.message}`);
    }

    const { data: player, error: playerError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', entry.player_id)
      .single();

    if (playerError || !player) {
      throw new Error(`Player not found: ${playerError?.message}`);
    }

    const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Golfer';
    const competitionName = entry.competition?.name || 'Competition';
    const clubName = entry.competition?.club?.name || 'Golf Club';
    const claimRef = verificationId.slice(-8).toUpperCase();

    const htmlContent = generateEmailTemplate({
      recipientName: playerName,
      title: 'Claim Update Required',
      body: `
        <p>Unfortunately, your hole-in-one claim for the <strong>${competitionName}</strong> at ${clubName} has been reviewed and requires additional information.</p>
        
        <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0; color: #DC2626; font-size: 16px;">Rejection Reason:</h3>
          <p style="margin: 0; color: #991B1B;">${rejectionReason}</p>
        </div>
        
        <p><strong>Claim Reference:</strong> #${claimRef}</p>
        
        <p>If you believe this decision was made in error or if you have additional evidence to support your claim, please contact us at <a href="mailto:claims@holein1.golf">claims@holein1.golf</a> with your claim reference number.</p>
        
        <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">We take verification seriously to maintain the integrity of our competitions. Thank you for your understanding.</p>
      `,
      ctaText: 'Contact Support',
      ctaUrl: 'mailto:claims@holein1.golf',
      footerText: 'Official Hole in 1 - Professional Golf Competitions',
    });

    const emailResponse = await resend.emails.send({
      from: 'Official Hole in 1 <claims@holein1.golf>',
      to: [player.email],
      subject: `Claim Update Required - ${competitionName}`,
      html: htmlContent,
    });

    console.log('Rejection email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error sending claim rejection email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
