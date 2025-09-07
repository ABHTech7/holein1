import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportTicketRequest {
  subject: string;
  category: string;
  priority: string;
  message: string;
  name: string;
  email: string;
  phone?: string;
  club_id?: string;
  user_id?: string;
  user_role?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ticketData: SupportTicketRequest = await req.json();
    console.log('Support ticket received:', ticketData);

    // Get club name if club_id is provided
    let clubName = 'Unknown Club';
    if (ticketData.club_id) {
      const { data: clubData } = await supabase
        .from('clubs')
        .select('name')
        .eq('id', ticketData.club_id)
        .single();
      
      if (clubData) {
        clubName = clubData.name;
      }
    }

    // Create audit trail entry
    if (ticketData.user_id) {
      await supabase
        .from('audit_events')
        .insert({
          user_id: ticketData.user_id,
          entity_type: 'support_ticket',
          entity_id: null,
          action: 'SUPPORT_TICKET_CREATED',
          old_values: null,
          new_values: {
            subject: ticketData.subject,
            category: ticketData.category,
            priority: ticketData.priority,
            club_name: clubName
          }
        });
    }

    // Add note to admin system
    if (ticketData.user_id) {
      await supabase
        .from('notes')
        .insert({
          entity_type: 'user',
          entity_id: ticketData.user_id,
          content: `Support ticket submitted: "${ticketData.subject}" (${ticketData.category}, ${ticketData.priority} priority)`,
          note_type: 'system',
          created_by: ticketData.user_id,
          created_by_name: ticketData.name,
          immutable: true
        });
    }

    // Send email to admin team
    const emailResponse = await resend.emails.send({
      from: "Support <support@holein1challenge.com>",
      to: ["support@holein1challenge.com", "admin@holein1challenge.com"],
      subject: `[${ticketData.priority.toUpperCase()}] ${ticketData.category} - ${ticketData.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 2px solid #e1e5e9; padding-bottom: 10px;">
            New Support Ticket
          </h1>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #495057; margin: 0 0 10px 0; font-size: 18px;">
              ${ticketData.subject}
            </h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 10px;">
              <span style="background: #007bff; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                ${ticketData.category}
              </span>
              <span style="background: ${
                ticketData.priority === 'urgent' ? '#dc3545' : 
                ticketData.priority === 'high' ? '#fd7e14' : 
                ticketData.priority === 'medium' ? '#ffc107' : '#28a745'
              }; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                ${ticketData.priority.toUpperCase()} Priority
              </span>
            </div>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #495057; margin-bottom: 10px;">Contact Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; width: 120px;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${ticketData.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                  <a href="mailto:${ticketData.email}" style="color: #007bff; text-decoration: none;">
                    ${ticketData.email}
                  </a>
                </td>
              </tr>
              ${ticketData.phone ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                  <a href="tel:${ticketData.phone}" style="color: #007bff; text-decoration: none;">
                    ${ticketData.phone}
                  </a>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Club:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${clubName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Role:</td>
                <td style="padding: 8px 0;">${ticketData.user_role || 'Unknown'}</td>
              </tr>
            </table>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #495057; margin-bottom: 10px;">Message</h3>
            <div style="background: white; padding: 15px; border: 1px solid #dee2e6; border-radius: 5px; white-space: pre-wrap; line-height: 1.5;">
${ticketData.message}
            </div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
            <p>This ticket was automatically generated from the Hole in 1 Challenge platform.</p>
            <p>Please respond directly to ${ticketData.email} or through your preferred support system.</p>
          </div>
        </div>
      `,
    });

    console.log("Support ticket email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Support ticket submitted successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-support-ticket function:", error);
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