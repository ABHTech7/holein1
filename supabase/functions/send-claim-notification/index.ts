import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

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

    // Format the email content
    const adminUrl = `https://srnbylbbsdckkwatfqjg.supabase.co/dashboard/admin/claims/${verificationId}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          🏌️ New Hole-in-One Claim Submitted!
        </h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Claim Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 8px 0;"><strong>Player:</strong> ${player.first_name} ${player.last_name} (${player.email})</li>
            <li style="margin: 8px 0;"><strong>Competition:</strong> ${competition.name}</li>
            <li style="margin: 8px 0;"><strong>Club:</strong> ${club.name}</li>
            <li style="margin: 8px 0;"><strong>Hole:</strong> ${competition.hole_number}</li>
            <li style="margin: 8px 0;"><strong>Claim Status:</strong> <span style="background-color: #fef3c7; padding: 2px 8px; border-radius: 4px;">${verification.status}</span></li>
            <li style="margin: 8px 0;"><strong>Submitted:</strong> ${new Date(verification.created_at).toLocaleString()}</li>
          </ul>
        </div>

        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #1e40af;">
            <strong>Action Required:</strong> Please review this claim in the admin dashboard to verify the hole-in-one.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${adminUrl}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review Claim in Admin Dashboard
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>This is an automated notification from the Hole-in-One Challenge system.</p>
          <p>Verification ID: ${verificationId}</p>
        </div>
      </div>
    `;

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Hole-in-One Claims <noreply@demo.holein1challenge.co.uk>",
      to: ["info@demo.holein1challenge.co.uk"],
      subject: `🏌️ New Hole-in-One Claim: ${player.first_name} ${player.last_name} at ${club.name}`,
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