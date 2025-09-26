import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PremiumNotificationRequest {
  premiumId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { premiumId }: PremiumNotificationRequest = await req.json();

    if (!premiumId) {
      return new Response(
        JSON.stringify({ error: "Premium ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch premium details with company information
    const { data: premium, error: premiumError } = await supabase
      .from('insurance_premiums')
      .select(`
        *,
        insurance_companies (
          name,
          contact_email,
          logo_url
        )
      `)
      .eq('id', premiumId)
      .single();

    if (premiumError || !premium) {
      console.error('Premium fetch error:', premiumError);
      return new Response(
        JSON.stringify({ error: "Premium not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const company = premium.insurance_companies as any;
    const periodStart = new Date(premium.period_start).toLocaleDateString('en-GB');
    const periodEnd = new Date(premium.period_end).toLocaleDateString('en-GB');
    const amount = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(premium.total_premium_amount);

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Hole in 1 Platform <noreply@holein1.com>",
      to: [company.contact_email],
      subject: `Premium Payment Required - ${periodStart} to ${periodEnd}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #1a1a1a; margin: 0;">Premium Payment Required</h1>
          </div>
          
          <p>Dear ${company.name} Team,</p>
          
          <p>This is to notify you that premium payment is now required for the following period:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1a1a1a;">Premium Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Period:</td>
                <td style="padding: 8px 0;">${periodStart} - ${periodEnd}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Total Entries:</td>
                <td style="padding: 8px 0;">${premium.total_entries.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Rate per Entry:</td>
                <td style="padding: 8px 0;">£${premium.premium_rate.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #ddd;">
                <td style="padding: 8px 0; font-weight: bold; font-size: 18px;">Total Premium Due:</td>
                <td style="padding: 8px 0; font-weight: bold; font-size: 18px; color: #0066cc;">${amount}</td>
              </tr>
            </table>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Please raise an invoice for the amount shown above</li>
            <li>Include the period dates in your invoice reference</li>
            <li>Send the invoice to our accounts department for processing</li>
          </ol>
          
          <p>If you have any questions regarding this premium calculation, please contact our team.</p>
          
          <p>Best regards,<br>
          Hole in 1 Platform Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    console.log("Premium notification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-premium-notification function:", error);
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