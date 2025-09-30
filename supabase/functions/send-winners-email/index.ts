import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { createBrandedEmailTemplate } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WinnersEmailRequest {
  entryId: string;
  playerEmail: string;
  playerName: string;
  competitionName: string;
  clubName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entryId, playerEmail, playerName, competitionName, clubName }: WinnersEmailRequest = await req.json();

    console.log('Sending winners email to:', playerEmail);

    // Create verification link that bypasses normal flow
    const verificationLink = `https://srnbylbbsdckkwatfqjg.supabase.co/win-claim/${entryId}`;

    const emailHtml = createBrandedEmailTemplate({
      preheader: `Amazing news! Submit your evidence to claim your prize`,
      heading: "🎉 Hole-in-One!",
      body: `
        <p>Hi ${playerName},</p>
        <p style="font-size: 18px; color: #C7A24C; font-weight: 600;">Congratulations on your incredible hole-in-one at ${clubName}!</p>
        <p>This is a momentous achievement in <strong>${competitionName}</strong>, and we're thrilled to help you claim your prize.</p>
        
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="font-family: 'Oswald', 'Arial Black', sans-serif; color: #0F3D2E; margin-bottom: 15px;">What You'll Need:</h3>
          <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li><strong>Video Evidence:</strong> Upload clear video footage of your hole-in-one</li>
            <li><strong>Witness Information:</strong> Provide details of witnesses present</li>
            <li><strong>Photo ID:</strong> Upload a valid photo ID for verification</li>
            <li><strong>Selfie:</strong> Take a selfie with your ID for identity confirmation</li>
            <li><strong>Handicap Proof:</strong> Upload proof of your handicap (if applicable)</li>
          </ol>
        </div>
        
        <p>We'll review your submission within 2-3 business days. Once verified, you'll receive instructions on claiming your prize.</p>
        <p style="font-size: 14px; color: #666; margin-top: 25px;"><em>Keep this email safe! You can use this link anytime to complete your verification.</em></p>
      `,
      ctaText: "Submit Evidence Now",
      ctaUrl: verificationLink,
      footerText: `${clubName} - ${competitionName}`,
    });

    const emailResponse = await resend.emails.send({
      from: "OHIO Golf <noreply@holein1.com>",
      to: [playerEmail],
      subject: `🎉 Congratulations on Your Hole-in-One at ${competitionName}!`,
      html: emailHtml,
    });

    console.log("Winners email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending winners email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);