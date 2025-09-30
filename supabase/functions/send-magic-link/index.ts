import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createBrandedEmailTemplate } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_DEMO_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MagicLinkRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  ageYears: number;
  handicap: number;
  competitionUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Magic link request received:", req.method);

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
    const { email, firstName, lastName, phone, ageYears, handicap, competitionUrl }: MagicLinkRequest = await req.json();
    
    console.log("Processing magic link for:", email);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Invalidate any existing unused tokens for this email
    const { error: invalidateError } = await supabaseAdmin
      .from('magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('email', email)
      .eq('used', false);

    if (invalidateError) {
      console.error("Error invalidating previous tokens:", invalidateError);
      // Continue anyway - this shouldn't block the new token creation
    }

    // Generate a secure token for the magic link
    const token = crypto.randomUUID();
    
    // Set expiration to 15 minutes from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    
    console.log("Token expiration set:");
    console.log("Current time (UTC):", now.toISOString());
    console.log("Expires at (UTC):", expiresAt.toISOString());

    // Store the magic link token with user data
    const { error: tokenError } = await supabaseAdmin
      .from('magic_link_tokens')
      .insert({
        token,
        email,
        first_name: firstName,
        last_name: lastName,
        phone_e164: phone,
        age_years: ageYears,
        handicap,
        competition_url: competitionUrl,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      console.error("Error storing magic link token:", tokenError);
      throw new Error("Failed to create magic link");
    }

    // Create the magic link URL - use base origin for auth callback
    const baseUrl = new URL(competitionUrl).origin;
    const magicLink = `${baseUrl}/auth/callback?token=${token}&redirect=${encodeURIComponent(competitionUrl)}`;

    // Send the email using branded template
    const emailHtml = createBrandedEmailTemplate({
      preheader: `Complete your entry in just a few clicks`,
      heading: "Complete Your Entry",
      body: `
        <p>Hi ${firstName},</p>
        <p>Ready to take on the challenge? Click the button below to complete your entry.</p>
        
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="font-family: 'Oswald', 'Arial Black', sans-serif; color: #0F3D2E; margin-bottom: 15px;">Your Entry Details</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Name:</strong></td>
              <td style="padding: 8px 0;">${firstName} ${lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
              <td style="padding: 8px 0;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
              <td style="padding: 8px 0;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Age:</strong></td>
              <td style="padding: 8px 0;">${ageYears} years</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Handicap:</strong></td>
              <td style="padding: 8px 0;">${handicap}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #666;">This secure link will expire in <strong>15 minutes</strong> for your security.</p>
      `,
      ctaText: "Complete My Entry",
      ctaUrl: magicLink,
      includeSecurityNote: true,
    });

    const emailResponse = await resend.emails.send({
      from: "OHIO Golf <noreply@demo.holein1challenge.co.uk>",
      to: [email],
      subject: "Complete Your Entry - OHIO Golf",
      html: emailHtml,
    });

    console.log("Magic link email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Magic link sent successfully",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-magic-link function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to send magic link" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);