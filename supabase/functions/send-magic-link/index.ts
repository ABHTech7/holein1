import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

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

    // Send the email using Resend with custom domain
    const emailResponse = await resend.emails.send({
      from: "Hole in 1 Challenge <noreply@officialholein1.com>",
      to: [email],
      subject: "Your Magic Link - Hole in 1 Challenge",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0F3D2E; font-size: 28px; margin-bottom: 10px;">Welcome to Hole in 1 Challenge!</h1>
            <p style="color: #666; font-size: 16px; margin: 0;">Hi ${firstName}, ready to take on the challenge?</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #0F3D2E 0%, #1a5a3e 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
            <h2 style="color: white; margin: 0 0 20px 0; font-size: 20px;">Click to Complete Your Entry</h2>
            <a href="${magicLink}" 
               style="background: #C7A24C; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; margin: 10px 0;">
              Enter Competition →
            </a>
            <p style="color: #a0d4c4; font-size: 14px; margin: 20px 0 0 0;">This link expires in 15 minutes</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0F3D2E; margin: 0 0 15px 0; font-size: 18px;">Your Entry Details</h3>
            <div style="display: grid; gap: 10px;">
              <p style="margin: 0; padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p style="margin: 0; padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0; padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Phone:</strong> ${phone}</p>
              <p style="margin: 0; padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Age:</strong> ${ageYears} years</p>
              <p style="margin: 0; padding: 8px 0;"><strong>Handicap:</strong> ${handicap}</p>
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⏰ Important:</strong> This magic link will expire in 15 minutes. If it expires, you'll need to request a new one.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              If you didn't request this email, you can safely ignore it.<br>
              This email was sent by Hole in 1 Challenge Demo System.
            </p>
          </div>
        </div>
      `,
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