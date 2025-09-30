import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createBrandedEmailTemplate } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_DEMO_API_KEY"));

// Enhanced security headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none';"
};

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
function isRateLimited(ip: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count++;
  return false;
}

// Input sanitization
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>{}]/g, '') // Remove potential script injection chars
    .substring(0, 255); // Limit length
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

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

  // Rate limiting by IP
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(clientIP, 5, 60000)) { // 5 requests per minute
    return new Response(JSON.stringify({ 
      success: false,
      error: "Too many requests. Please wait before trying again." 
    }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const requestBody = await req.json();
    
    // Input validation and sanitization
    const email = sanitizeInput(requestBody.email?.toLowerCase() || '');
    const firstName = sanitizeInput(requestBody.firstName || '');
    const lastName = sanitizeInput(requestBody.lastName || '');
    const phone = sanitizeInput(requestBody.phone || '');
    const competitionUrl = sanitizeInput(requestBody.competitionUrl || '');
    
    // Validate required fields
    if (!validateEmail(email)) {
      throw new Error("Invalid email address");
    }
    
    if (!firstName || firstName.length < 1) {
      throw new Error("First name is required");
    }
    
    if (!competitionUrl || !competitionUrl.startsWith('http')) {
      throw new Error("Invalid competition URL");
    }

    // Validate numeric fields
    const ageYears = parseInt(requestBody.ageYears);
    const handicap = parseFloat(requestBody.handicap);
    
    if (isNaN(ageYears) || ageYears < 16 || ageYears > 120) {
      throw new Error("Age must be between 16 and 120");
    }
    
    if (isNaN(handicap) || handicap < -10 || handicap > 54) {
      throw new Error("Handicap must be between -10 and 54");
    }
    
    console.log("Processing secure magic link for:", email);

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
    }

    // Generate a secure token for the magic link
    const token = crypto.randomUUID();
    
    // Set expiration to 15 minutes from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

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
      throw new Error("Failed to create secure entry link");
    }

    // Create the magic link URL
    const baseUrl = new URL(competitionUrl).origin;
    const magicLink = `${baseUrl}/auth/callback?token=${token}&redirect=${encodeURIComponent(competitionUrl)}`;

    // Send the email using branded template
    const emailHtml = createBrandedEmailTemplate({
      preheader: `Secure entry link - expires in 15 minutes`,
      heading: "Your Secure Entry Link",
      body: `
        <p>Hi ${firstName},</p>
        <p>We've received your request to enter a competition. Click the secure button below to complete your entry.</p>
        
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="font-family: 'Oswald', 'Arial Black', sans-serif; color: #0F3D2E; margin-bottom: 15px;">Your Details</h3>
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
      subject: "Your Secure Entry Link - OHIO Golf",
      html: emailHtml,
    });

    console.log("Secure magic link email sent successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Secure entry link sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-magic-link-secure function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to send secure entry link" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);