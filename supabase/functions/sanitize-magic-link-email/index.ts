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

// HTML entity encoding to prevent XSS
const htmlEncode = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Validate and sanitize input data
const validateAndSanitize = (data: MagicLinkRequest): MagicLinkRequest => {
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }

  // Name validation - allow only letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(data.firstName) || !nameRegex.test(data.lastName)) {
    throw new Error('Names can only contain letters, spaces, hyphens, and apostrophes');
  }

  // Phone validation - allow only digits, spaces, +, -, (, )
  const phoneRegex = /^[\+\-\s\(\)\d]+$/;
  if (!phoneRegex.test(data.phone)) {
    throw new Error('Invalid phone number format');
  }

  // Age validation
  if (data.ageYears < 16 || data.ageYears > 120) {
    throw new Error('Age must be between 16 and 120');
  }

  // Handicap validation
  if (data.handicap < -10 || data.handicap > 54) {
    throw new Error('Handicap must be between -10 and 54');
  }

  // URL validation
  try {
    new URL(data.competitionUrl);
  } catch {
    throw new Error('Invalid competition URL');
  }

  return {
    email: data.email.toLowerCase().trim(),
    firstName: htmlEncode(data.firstName.trim()),
    lastName: htmlEncode(data.lastName.trim()),
    phone: data.phone.trim(),
    ageYears: data.ageYears,
    handicap: data.handicap,
    competitionUrl: data.competitionUrl
  };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Secure magic link request received:", req.method);

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
    const rawData: MagicLinkRequest = await req.json();
    
    // Validate and sanitize all input data
    const sanitizedData = validateAndSanitize(rawData);
    
    console.log("Processing secure magic link for:", sanitizedData.email);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token with sanitized data
    const { error: insertError } = await supabaseAdmin
      .from('magic_link_tokens')
      .insert({
        token: token,
        email: sanitizedData.email,
        first_name: sanitizedData.firstName,
        last_name: sanitizedData.lastName,
        phone_e164: sanitizedData.phone,
        age_years: sanitizedData.ageYears,
        handicap: sanitizedData.handicap,
        competition_url: sanitizedData.competitionUrl,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      console.error("Error storing magic link token:", insertError);
      throw new Error("Failed to process magic link request");
    }

    // Create secure magic link
    const competitionOrigin = new URL(sanitizedData.competitionUrl).origin;
    const magicLink = `${competitionOrigin}/auth/callback?token=${token}`;

    // Send sanitized email
    const emailResponse = await resend.emails.send({
      from: "Official Hole in 1 <noreply@demo.holein1challenge.co.uk>",
      to: [sanitizedData.email],
      subject: "Complete Your Golf Competition Entry",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #1a472a; text-align: center; margin-bottom: 30px;">
              🏌️ Complete Your Entry
            </h1>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hello ${sanitizedData.firstName},
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
              You're one step away from entering Official Hole in 1! Click the button below to complete your registration and make your attempt.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${magicLink}" 
                 style="background: linear-gradient(135deg, #1a472a 0%, #2d7a3d 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        font-size: 18px; 
                        font-weight: bold; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(26, 71, 42, 0.3);">
                Complete My Entry
              </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #1a472a; margin-top: 0;">Your Entry Details:</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Name:</strong> ${sanitizedData.firstName} ${sanitizedData.lastName}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Age:</strong> ${sanitizedData.ageYears}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Handicap:</strong> ${sanitizedData.handicap}</p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This link will expire in 30 minutes for security reasons. If you didn't request this, please ignore this email.
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #888; margin: 0;">
                Official Hole in 1 - Making Golf History, One Shot at a Time
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error("Error sending email:", emailResponse.error);
      throw new Error("Failed to send verification email");
    }

    console.log("Secure magic link email sent successfully:", emailResponse.data);

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
    console.error("Error in secure magic link function:", error);
    
    // Don't expose internal errors to prevent information leakage
    const safeMessage = error.message?.includes('Invalid') ? error.message : 'Failed to process request';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: safeMessage
      }),
      {
        status: error.message?.includes('Invalid') ? 400 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);