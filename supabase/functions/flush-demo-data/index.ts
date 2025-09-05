import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlushRequest {
  demoSecret?: string;
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

    console.log("Starting demo data flush...");

    const demoEmails = [
      "admin@holein1.test",
      "club1@holein1.test", 
      "club2@holein1.test",
      "player1@holein1.test"
    ];

    // Get demo user IDs
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const demoUsers = users.users?.filter(u => demoEmails.includes(u.email!)) || [];
    const demoUserIds = demoUsers.map(u => u.id);

    console.log(`Found ${demoUsers.length} demo users to clean up`);

    // Delete entries for demo users
    if (demoUserIds.length > 0) {
      const { error: entriesError } = await supabaseAdmin
        .from("entries")
        .delete()
        .in("player_id", demoUserIds);

      if (entriesError && entriesError.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error("Error deleting demo entries:", entriesError);
      } else {
        console.log("Deleted demo entries");
      }
    }

    // Delete competitions from demo clubs
    const demoClubNames = ["Fairway Park Golf Club", "Oakview Links"];
    const { data: demoClubs } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .in("name", demoClubNames);

    if (demoClubs && demoClubs.length > 0) {
      const demoClubIds = demoClubs.map(c => c.id);
      
      // Delete competitions from demo clubs
      const { error: competitionsError } = await supabaseAdmin
        .from("competitions")
        .delete()
        .in("club_id", demoClubIds);

      if (competitionsError && competitionsError.code !== 'PGRST116') {
        console.error("Error deleting demo competitions:", competitionsError);
      } else {
        console.log("Deleted demo competitions");
      }

      // Delete demo clubs
      const { error: clubsError } = await supabaseAdmin
        .from("clubs")
        .delete()
        .in("id", demoClubIds);

      if (clubsError && clubsError.code !== 'PGRST116') {
        console.error("Error deleting demo clubs:", clubsError);
      } else {
        console.log("Deleted demo clubs");
      }
    }

    // Delete leads from demo clubs (if any)
    const { error: leadsError } = await supabaseAdmin
      .from("leads")
      .delete()
      .in("email", demoEmails);

    if (leadsError && leadsError.code !== 'PGRST116') {
      console.error("Error deleting demo leads:", leadsError);
    } else {
      console.log("Deleted demo leads");
    }

    // Delete profiles for demo users
    if (demoUserIds.length > 0) {
      const { error: profilesError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .in("id", demoUserIds);

      if (profilesError && profilesError.code !== 'PGRST116') {
        console.error("Error deleting demo profiles:", profilesError);
      } else {
        console.log("Deleted demo profiles");
      }
    }

    // Delete auth users
    for (const user of demoUsers) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Error deleting auth user ${user.email}:`, deleteError);
        } else {
          console.log(`Deleted auth user: ${user.email}`);
        }
      } catch (err) {
        console.error(`Error deleting auth user ${user.email}:`, err);
      }
    }

    console.log("Demo data flush completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Demo data flushed successfully",
        deletedUsers: demoUsers.length,
        deletedClubs: demoClubs?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in flush-demo-data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);