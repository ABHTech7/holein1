import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlushRequest {
  demoSecret?: string;
  recentOnly?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment check
    const isDevelopment = Deno.env.get("NODE_ENV") !== "production";
    const demoSecret = Deno.env.get("DEMO_SEED_SECRET");
    
    if (!isDevelopment) {
      if (!demoSecret) {
        throw new Error("Demo flushing not available in production without secret");
      }
      
      const { demoSecret: providedSecret }: FlushRequest = await req.json();
      if (providedSecret !== demoSecret) {
        throw new Error("Invalid demo secret");
      }
    }

    // Parse request body
    const body = await req.json() as FlushRequest;
    const recentOnly = body.recentOnly !== undefined ? body.recentOnly : true;

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

    console.log(`Starting demo data flush (${recentOnly ? 'recent only' : 'all demo data'})...`);

    // Use the new cleanup function
    const { data: cleanupResult, error: cleanupError } = await supabaseAdmin.rpc('cleanup_demo_data', { 
      cleanup_all: !recentOnly 
    });

    if (cleanupError) {
      throw cleanupError;
    }

    console.log("Cleanup result:", cleanupResult);

    // Delete demo auth users (for demo users we created)
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const demoUsers = authUsers.users?.filter(user => 
        user.email?.includes("@demo-golfer.test") || 
        user.email?.includes("holein1demo.test") || 
        user.email?.includes("@holein1.test")
      ) || [];

      for (const user of demoUsers) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }

      console.log(`Deleted ${demoUsers.length} demo auth users`);
    } catch (error) {
      console.error("Error deleting demo auth users:", error);
    }

    return new Response(
      JSON.stringify({
        message: "Demo data flushed successfully",
        deletedUsers: (cleanupResult as any)?.deleted_profiles || 0,
        deletedClubs: (cleanupResult as any)?.deleted_clubs || 0,
        deletedCompetitions: (cleanupResult as any)?.deleted_competitions || 0,
        deletedEntries: (cleanupResult as any)?.deleted_entries || 0,
        cleanupMode: (cleanupResult as any)?.cleanup_mode || 'unknown'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Flush error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to flush demo data"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);