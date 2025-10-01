import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createBrandedEmailTemplate } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_DEMO_API_KEY"));

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
    const { verificationId, entryId, playerId, competitionId }: ClaimConfirmationRequest = await req.json();
    
    console.log("Processing claim confirmation for:", { verificationId, entryId, playerId });

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get player details
    const { data: player, error: playerError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      console.error("Error fetching player:", playerError);
      throw new Error("Player not found");
    }

    // Get competition details
    const { data: competition, error: competitionError } = await supabaseAdmin
      .from('competitions')
      .select('name, prize_pool, club:clubs!inner(name)')
      .eq('id', competitionId)
      .single();

    if (competitionError || !competition) {
      console.error("Error fetching competition:", competitionError);
      throw new Error("Competition not found");
    }

    const claimReference = verificationId.slice(-8).toUpperCase();
    const prizeAmount = (competition.prize_pool / 100).toFixed(2);

    // Send confirmation email
    const emailHtml = createBrandedEmailTemplate({
      preheader: `Your claim reference: #${claimReference}`,
      heading: "Verification Submitted!",
      body: `
        <p>Hi ${player.first_name},</p>
        <p>Congratulations! Your hole-in-one claim has been successfully submitted and is now under review.</p>
        
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 24px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #22c55e;">
          <h3 style="font-family: 'Oswald', 'Arial Black', sans-serif; color: #0F3D2E; margin-bottom: 15px; font-size: 20px;">📋 Claim Details</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Claim Reference:</strong></td>
              <td style="padding: 8px 0; font-family: monospace; font-weight: bold; font-size: 16px; color: #0F3D2E;">#${claimReference}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Competition:</strong></td>
              <td style="padding: 8px 0;">${competition.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Club:</strong></td>
              <td style="padding: 8px 0;">${(competition as any).club.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Prize Amount:</strong></td>
              <td style="padding: 8px 0; font-weight: bold; color: #C7A24C;">£${prizeAmount}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
          <h4 style="font-family: 'Oswald', 'Arial Black', sans-serif; color: #92400e; margin-bottom: 10px; font-size: 16px;">⏳ What Happens Next?</h4>
          <p style="color: #78350f; margin: 0; font-size: 14px;">
            Our verification team will carefully review your evidence within 12 hours. 
            If approved, your prize will be processed and you'll receive further instructions.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 25px;">
          <strong style="color: #0F3D2E;">Important:</strong> Please keep your claim reference number safe. 
          You'll need it to track the status of your verification.
        </p>
        
        <p style="font-size: 14px; color: #666;">
          If you have any questions about your claim, please contact us and quote your reference number.
        </p>
      `,
      ctaText: "Complete My Entry",
      ctaUrl: `${new URL(Deno.env.get("SUPABASE_URL") ?? "").origin}/player/dashboard`,
      includeSecurityNote: false,
    });

    const emailResponse = await resend.emails.send({
      from: "OHIO Golf <noreply@demo.holein1challenge.co.uk>",
      to: [player.email],
      subject: `Claim Submitted - Reference #${claimReference}`,
      html: emailHtml,
    });

    console.log("Claim confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Claim confirmation email sent successfully",
      emailId: emailResponse.data?.id,
      claimReference 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

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
