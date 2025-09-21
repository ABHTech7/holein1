import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_DEMO_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadNotificationRequest {
  lead: {
    clubName: string;
    contactName: string;
    role: string;
    email: string;
    phone: string;
    message: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead }: LeadNotificationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Official Hole in 1 <noreply@officialholein1.com>",
      to: ["info@officialholein1.com"],
      subject: `New Club Partnership Application - ${lead.clubName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0F3D2E; border-bottom: 2px solid #C7A24C; padding-bottom: 10px;">
            New Partnership Application
          </h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #0F3D2E; margin-top: 0;">Club Information</h2>
            <p><strong>Club Name:</strong> ${lead.clubName}</p>
            <p><strong>Contact Name:</strong> ${lead.contactName}</p>
            <p><strong>Role:</strong> ${lead.role}</p>
            <p><strong>Email:</strong> <a href="mailto:${lead.email}">${lead.email}</a></p>
            <p><strong>Phone:</strong> ${lead.phone || 'Not provided'}</p>
          </div>
          
          ${lead.message ? `
          <div style="background: #fff; padding: 20px; border-left: 4px solid #C7A24C; margin: 20px 0;">
            <h3 style="color: #0F3D2E; margin-top: 0;">Message from ${lead.contactName}</h3>
            <p style="line-height: 1.6;">${lead.message}</p>
          </div>
          ` : ''}
          
          <div style="background: #0F3D2E; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p><strong>Next Steps:</strong></p>
            <p>Respond within 24 hours to maintain our service commitment.</p>
            <p style="margin: 0;"><a href="mailto:${lead.email}" style="background: #C7A24C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Reply to ${lead.contactName}</a></p>
          </div>
          
          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
            This email was generated automatically from the Official Hole in 1 club signup form.
          </p>
        </div>
      `,
    });

    console.log("Lead notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-lead-notification function:", error);
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