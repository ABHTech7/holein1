import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadBackgroundRequest {
  leadId: string;
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
    console.log('Process-lead-background function invoked');
    
    const { leadId, lead }: LeadBackgroundRequest = await req.json();
    
    // Validate required fields
    if (!leadId) {
      console.error('Missing required field: leadId');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'leadId is required' 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    if (!lead?.email) {
      console.error('Missing required field: lead.email');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'lead.email is required' 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    if (!lead?.clubName) {
      console.error('Missing required field: lead.clubName');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'lead.clubName is required' 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
    
    console.log(`Starting background email processing for lead: ${leadId}, club: ${lead.clubName}`);

    // Create Supabase client with service role key for database updates
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "Official Hole in 1 <noreply@demo.holein1challenge.co.uk>",
      to: ["info@holein1challenge.co.uk"],
      reply_to: lead.email,
      subject: `New Club Partnership Application - ${lead.clubName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Partnership Application</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-bottom: 15px;">Club Information</h3>
            <p><strong>Club Name:</strong> ${lead.clubName}</p>
            <p><strong>Contact Name:</strong> ${lead.contactName}</p>
            <p><strong>Role:</strong> ${lead.role}</p>
            <p><strong>Email:</strong> <a href="mailto:${lead.email}">${lead.email}</a></p>
            <p><strong>Phone:</strong> ${lead.phone || 'Not provided'}</p>
          </div>

          ${lead.message ? `
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-bottom: 15px;">Additional Message</h3>
              <p style="line-height: 1.6;">${lead.message}</p>
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px;">
              This application was submitted through the partnership form on the Official Hole in 1 website.
              Please respond within 24 hours as promised to the applicant.
            </p>
          </div>
        </div>
      `,
    });

    if (!emailResponse.data?.id) {
      console.error('Email send failed: no email ID returned', emailResponse);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email send failed: no email ID returned',
        leadId 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("Email sent successfully:", emailResponse);

    // Update lead record with email status
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Failed to update lead email status:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Database update failed after email was sent',
        emailId: emailResponse.data?.id,
        leadId 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } else {
      console.log(`Lead ${leadId} updated with email sent status`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      leadId 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in process-lead-background function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      note: "Background processing failed but lead was saved"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);