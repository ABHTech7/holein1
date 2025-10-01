import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const verificationId = url.searchParams.get('id');
    const token = url.searchParams.get('token');

    if (!verificationId || !token) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Link</title>
            <style>
              body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid Confirmation Link</h1>
            <p>The confirmation link is missing required parameters.</p>
          </body>
        </html>`,
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 400 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token and check expiration
    const { data: confirmation, error: confirmError } = await supabase
      .from('witness_confirmations')
      .select('*')
      .eq('verification_id', verificationId)
      .eq('token', token)
      .single();

    if (confirmError || !confirmation) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Token</title>
            <style>
              body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid or Expired Link</h1>
            <p>This confirmation link is either invalid or has expired.</p>
            <p>Please contact support if you believe this is an error.</p>
          </body>
        </html>`,
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 400 
        }
      );
    }

    // Check if already confirmed
    if (confirmation.confirmed_at) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Already Confirmed</title>
            <style>
              body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .success { color: #059669; }
            </style>
          </head>
          <body>
            <h1 class="success">✓ Already Confirmed</h1>
            <p>This witness confirmation was already submitted on ${new Date(confirmation.confirmed_at).toLocaleString()}.</p>
            <p>No further action is needed. Thank you!</p>
          </body>
        </html>`,
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 200 
        }
      );
    }

    // Check expiration
    if (new Date(confirmation.expires_at) < new Date()) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Link Expired</title>
            <style>
              body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">Link Expired</h1>
            <p>This confirmation link has expired (48-hour limit).</p>
            <p>Please contact support@holein1.test for assistance.</p>
          </body>
        </html>`,
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 400 
        }
      );
    }

    // Mark as confirmed with metadata
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    const { error: updateError } = await supabase
      .from('witness_confirmations')
      .update({
        confirmed_at: new Date().toISOString(),
        meta: {
          user_agent: userAgent,
          ip_address: ipAddress,
          confirmed_timestamp: new Date().toISOString()
        }
      })
      .eq('id', confirmation.id);

    if (updateError) {
      console.error('Failed to update confirmation:', updateError);
      throw new Error('Failed to confirm witness');
    }

    // Update verification record
    await supabase
      .from('verifications')
      .update({
        witness_confirmed_at: new Date().toISOString()
      })
      .eq('id', verificationId);

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Confirmation Successful</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 40px 20px; 
              text-align: center;
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            }
            .card {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .success-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 { color: #059669; margin: 0 0 20px; }
            p { color: #374151; line-height: 1.6; margin: 15px 0; }
            .info-box {
              background-color: #f0fdf4;
              border: 2px solid #10b981;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success-icon">✓</div>
            <h1>Confirmation Successful!</h1>
            <p>Thank you for confirming your witness of this hole-in-one.</p>
            
            <div class="info-box">
              <strong>What happens next:</strong><br><br>
              • Your confirmation has been recorded<br>
              • The claim will now proceed to document review<br>
              • The player will be notified of your confirmation
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              This window can now be closed. No further action is needed.
            </p>
          </div>
        </body>
      </html>`,
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">An Error Occurred</h1>
          <p>We encountered an error processing your confirmation.</p>
          <p>Please contact support@holein1.test for assistance.</p>
        </body>
      </html>`,
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 500 
      }
    );
  }
});
