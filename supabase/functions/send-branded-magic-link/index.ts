import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrandedMagicLinkRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  ageYears?: number;
  handicap?: number | null;
  competitionUrl: string;
  competitionName?: string;
  clubName?: string;
}

const createBrandedEmailTemplate = (data: BrandedMagicLinkRequest, magicLink: string, dashboardMagicLink?: string) => {
  const { firstName, lastName, ageYears, handicap, competitionName, clubName } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Official Hole in 1 - Complete Your Entry</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f7fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0F3D2E 0%, #1a5a3e 100%); padding: 30px 20px; text-align: center;">
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">
            🏌️ Official Hole in 1
          </div>
          <div style="color: #a0d4c4; font-size: 16px; font-weight: 400;">
            Making Golf History, One Shot at a Time
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <h1 style="color: #0F3D2E; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: center;">
            Welcome, ${firstName}!
          </h1>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            You're just one click away from entering <strong>${competitionName || 'the competition'}</strong> 
            ${clubName ? ` at ${clubName}` : ''}. Click the button below to complete your registration and secure your spot.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${magicLink}" 
               style="background: linear-gradient(135deg, #C7A24C 0%, #d4b356 100%); 
                      color: #ffffff; 
                      text-decoration: none; 
                      padding: 16px 32px; 
                      border-radius: 8px; 
                      font-size: 18px; 
                      font-weight: 600; 
                      display: inline-block;
                      box-shadow: 0 4px 12px rgba(199, 162, 76, 0.3);
                      transition: all 0.2s ease;">
              Complete My Entry →
            </a>
          </div>

          <!-- Player Dashboard Link -->
          <div style="text-align: center; margin: 20px 0 35px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              Already entered? View your entry history:
            </p>
            <a href="${dashboardMagicLink || magicLink.replace(encodeURIComponent(data.competitionUrl), encodeURIComponent('/player/dashboard'))}" 
               style="background: #f3f4f6; 
                      color: #374151; 
                      text-decoration: none; 
                      padding: 12px 24px; 
                      border-radius: 6px; 
                      font-size: 14px; 
                      font-weight: 500; 
                      display: inline-block;
                      border: 1px solid #d1d5db;
                      transition: all 0.2s ease;">
              📊 View My Entries
            </a>
          </div>

          <!-- Entry Details Card -->
          <div style="background: #f8fffe; border: 1px solid #e2f4f1; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #0F3D2E; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">
              📋 Your Entry Details
            </h3>
            <div style="color: #4a5568; font-size: 14px; line-height: 1.5;">
              <div style="margin-bottom: 8px;"><strong>Name:</strong> ${firstName} ${lastName}</div>
              <div style="margin-bottom: 8px;"><strong>Age:</strong> ${ageYears} years</div>
              <div style="margin-bottom: 8px;"><strong>Handicap:</strong> ${handicap === null ? 'No handicap' : handicap}</div>
              ${competitionName ? `<div style="margin-bottom: 8px;"><strong>Competition:</strong> ${competitionName}</div>` : ''}
              ${clubName ? `<div><strong>Venue:</strong> ${clubName}</div>` : ''}
            </div>
          </div>

          <!-- What's Next -->
          <div style="background: #fffbf0; border: 1px solid #f7e6a3; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h4 style="color: #8B4513; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
              🎯 What Happens Next?
            </h4>
            <ul style="color: #8B4513; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 5px;">Complete your entry and payment</li>
              <li style="margin-bottom: 5px;">Receive your attempt confirmation</li>
              <li style="margin-bottom: 5px;">Make your hole-in-one attempt</li>
              <li>Win amazing prizes!</li>
            </ul>
          </div>

          <!-- Security Notice -->
          <div style="background: #fef7f7; border: 1px solid #f1c6c6; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #c53030; font-size: 13px; margin: 0; text-align: center;">
              🔒 <strong>Security Notice:</strong> This secure link expires in 6 hours and can be clicked multiple times until you select Won/Missed.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fffe; padding: 25px 30px; border-top: 1px solid #e2f4f1; text-align: center;">
          <div style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            <p style="margin: 0 0 8px 0;">
              If you didn't request this entry, you can safely ignore this email.
            </p>
            <p style="margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} Official Hole in 1. All rights reserved.
            </p>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Branded magic link request received:", req.method);

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
    const requestData: BrandedMagicLinkRequest = await req.json();
    
    // Apply defaults for missing fields
    const processedData = {
      ...requestData,
      firstName: requestData.firstName?.trim() || 'Golfer',
      lastName: requestData.lastName?.trim() || '',
      phone: requestData.phone?.trim() || '',
      ageYears: requestData.ageYears || 18,
      handicap: requestData.handicap ?? null
    };
    
    // Validate required fields (only email and competitionUrl are truly required)
    if (!processedData.email || !processedData.competitionUrl) {
      throw new Error("Missing required fields: email and competitionUrl are required");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(processedData.email)) {
      throw new Error("Invalid email format");
    }

    // Age validation (with default applied)
    if (processedData.ageYears < 13 || processedData.ageYears > 120) {
      throw new Error("Age must be between 13 and 120");
    }

    // Handicap validation (allowing null)
    if (processedData.handicap !== null && (processedData.handicap < -10 || processedData.handicap > 54)) {
      throw new Error("Handicap must be between -10 and 54");
    }
    
    console.log("Processing branded magic link for:", processedData.email, "with defaults applied:", {
      firstName: processedData.firstName,
      ageYears: processedData.ageYears,
      handicap: processedData.handicap
    });

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Clean previous unused tokens for this email
    await supabaseAdmin
      .from('magic_link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('email', processedData.email.toLowerCase().trim())
      .eq('used', false);

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

    // Store token with all data
    const { error: insertError } = await supabaseAdmin
      .from('magic_link_tokens')
      .insert({
        token,
        email: processedData.email.toLowerCase().trim(),
        first_name: processedData.firstName,
        last_name: processedData.lastName,
        phone_e164: processedData.phone,
        age_years: processedData.ageYears,
        handicap: processedData.handicap,
        competition_url: processedData.competitionUrl,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      console.error("Error storing magic link token:", insertError);
      throw new Error("Failed to create secure entry link");
    }

    // Create magic link for entry and dashboard
    const baseUrl = new URL(processedData.competitionUrl).origin;
    const magicLink = `${baseUrl}/auth/callback?token=${token}&redirect=${encodeURIComponent(processedData.competitionUrl)}`;
    const dashboardMagicLink = `${baseUrl}/auth/callback?token=${token}&redirect=${encodeURIComponent('/player/dashboard')}`;

    // Send branded email
    const emailResponse = await resend.emails.send({
      from: "Official Hole in 1 <entry@demo.holein1challenge.co.uk>",
      reply_to: "entry@demo.holein1challenge.co.uk",
      to: [processedData.email.toLowerCase().trim()],
      subject: `Complete Your Entry - ${processedData.competitionName || 'Official Hole in 1'}`,
      html: createBrandedEmailTemplate(processedData, magicLink, dashboardMagicLink),
    });

    if (emailResponse.error) {
      console.error("Error sending branded email:", emailResponse.error);
      const errMsg = emailResponse.error?.message || "Failed to send entry confirmation email";
      return new Response(
        JSON.stringify({ success: false, error: errMsg, code: emailResponse.error?.name || "email_send_error" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Branded magic link email sent successfully:", emailResponse.data);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Entry confirmation sent successfully",
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in branded magic link function:", error);
    const message = error?.message || (typeof error === 'string' ? error : 'Failed to send entry confirmation');
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);