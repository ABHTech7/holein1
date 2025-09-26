import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

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

    const emailResponse = await resend.emails.send({
      from: "Official Hole in 1 <noreply@holein1.com>",
      to: [playerEmail],
      subject: `🏆 HOLE-IN-ONE! Complete Your Evidence Submission`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; font-size: 32px; margin: 0; font-weight: bold;">🏆 INCREDIBLE SHOT!</h1>
            <p style="color: white; font-size: 18px; margin: 10px 0 0;">Legend status awaits...</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin: 0 0 20px;">Hey ${playerName}!</h2>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              You just reported a <strong>HOLE-IN-ONE</strong> at <strong>${clubName}</strong> in the <strong>${competitionName}</strong> competition!
            </p>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">
              To secure your legendary achievement and claim your prize, we need to collect some evidence. This link will always take you directly to your evidence submission:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background: linear-gradient(135deg, #dc2626, #ef4444); 
                        color: white; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 18px;
                        display: inline-block;
                        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
                🎯 Complete Evidence Submission
              </a>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 25px 0;">
              <h3 style="color: #059669; margin: 0 0 10px; font-size: 16px;">What you'll need:</h3>
              <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>A selfie for identity verification</li>
                <li>Photo of your ID document</li>
                <li>Proof of handicap (if applicable)</li>
                <li>Witness information</li>
                <li>Optional: Upload your shot video</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 25px;">
              Keep this email safe! You can use this link anytime to complete your verification. 
              The process takes just a few minutes and ensures your incredible achievement gets the recognition it deserves.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Official Hole in 1 | Celebrating golf's greatest moments
              </p>
            </div>
          </div>
        </div>
      `,
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