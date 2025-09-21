import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

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

    // Send the email using Resend
    const emailResponse = await resend.emails.send({
      from: "Hole in 1 Challenge <noreply@officialholein1.com>",
      to: [email],
      subject: "Your Secure Entry Link - Hole in 1 Challenge",
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
            <p style="color: #a0d4c4; font-size: 14px; margin: 20px 0 0 0;">This secure link expires in 15 minutes</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>🔒 Security Notice:</strong> This is a secure, one-time use link that will expire in 15 minutes for your protection.
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