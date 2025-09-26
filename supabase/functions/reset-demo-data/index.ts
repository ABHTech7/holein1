import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );

    console.log("Starting simple demo data reset...");

    // Use the existing cleanup function to remove all demo data
    const { data: cleanupResult, error: cleanupError } = await supabaseAdmin.rpc('cleanup_demo_data', { 
      cleanup_all: true 
    });

    if (cleanupError) {
      throw cleanupError;
    }

    console.log("Cleanup completed:", cleanupResult);

    // Seed fresh demo data using existing function
    const { data: seedResult, error: seedError } = await supabaseAdmin.functions.invoke('seed-demo-data', {
      body: { force: true }
    });

    if (seedError) {
      console.error("Seed error:", seedError);
      throw seedError;
    }

    console.log("Demo reset completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo data reset successfully",
        cleanup: cleanupResult,
        seed: seedResult
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Demo reset error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to reset demo data"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);