import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createBrandedEmailTemplate } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimNotificationRequest {
  verificationId: string;
  entryId: string;
  playerId: string;
  competitionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verificationId, entryId, playerId, competitionId }: ClaimNotificationRequest = await req.json();
    
    console.log('Processing claim notification for verification:', verificationId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch verification details with related data
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .select(`
        *,
        entries!inner(
          *,
          profiles!inner(first_name, last_name, email),
          competitions!inner(
            name,
            hole_number,
            clubs!inner(name)
          )
        )
      `)
      .eq('id', verificationId)
      .single();

    if (verificationError || !verification) {
      console.error('Error fetching verification:', verificationError);
      throw new Error('Verification not found');
    }

    const entry = verification.entries;
    const player = entry.profiles;
    const competition = entry.competitions;
    const club = competition.clubs;

    // Format the email content with branded template
    const adminUrl = `https://holein1.golf/dashboard/admin/claims/${verificationId}`;
    
    const emailHtml = createBrandedEmailTemplate({
      preheader: `New claim from ${player.first_name} ${player.last_name} requires review`,
      heading: "New Claim Submitted",
      body: `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="font-family: 'Oswald', 'Arial Black', sans-serif; color: #0F3D2E; margin-bottom: 15px;">Claim Details</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Player:</strong></td>
              <td style="padding: 8px 0;">${player.first_name} ${player.last_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
              <td style="padding: 8px 0;">${player.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Competition:</strong></td>
              <td style="padding: 8px 0;">${competition.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Club:</strong></td>
              <td style="padding: 8px 0;">${club.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Hole:</strong></td>
              <td style="padding: 8px 0;">${competition.hole_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Status:</strong></td>
              <td style="padding: 8px 0;"><span style="background-color: #C7A24C; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${verification.status}</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Submitted:</strong></td>
              <td style="padding: 8px 0;">${new Date(verification.created_at).toLocaleString()}</td>
            </tr>
          </table>
        </div>
        <p>A player has submitted evidence for a hole-in-one claim. Please review the submission and verify the evidence.</p>
        <p style="font-size: 14px; color: #666; margin-top: 20px;"><em>Action required: Review and approve or reject this claim.</em></p>
        <p style="font-size: 12px; color: #999; margin-top: 15px;">Verification ID: ${verificationId}</p>
      `,
      ctaText: "Review Claim in Dashboard",
      ctaUrl: adminUrl,
      footerText: "OHIO Golf Admin Notifications",
    });

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "OHIO Golf Admin <noreply@demo.holein1challenge.co.uk>",
      to: ["info@demo.holein1challenge.co.uk"],
      subject: `🚨 New Hole-in-One Claim: ${player.first_name} ${player.last_name} at ${club.name}`,
      html: emailHtml,
    });

    console.log("Claim notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      verificationId 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-claim-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);