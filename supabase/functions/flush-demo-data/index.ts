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

    console.log("Starting comprehensive demo data flush...");

    // Demo emails to preserve (original small demo set)
    const preservedDemoEmails = [
      "admin@holein1.test",
      "club1@holein1.test", 
      "club2@holein1.test",
      "player1@holein1.test"
    ];

    // Get ALL users to identify demo users (comprehensive dataset)
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const demoUsers = allUsers.users?.filter(u => 
      u.email?.includes('@holein1demo.test') || 
      u.email?.includes('@demo.test') ||
      preservedDemoEmails.includes(u.email!)
    ) || [];
    
    const demoUserIds = demoUsers.map(u => u.id);
    console.log(`Found ${demoUsers.length} demo users to clean up`);

    // Get all demo clubs (both old and new comprehensive dataset)
    const { data: allClubs } = await supabaseAdmin
      .from("clubs")
      .select("id, name, email");

    const demoClubs = allClubs?.filter(club => 
      club.email?.includes('@holein1demo.test') ||
      club.email?.includes('@demo.test') ||
      club.name === "Fairway Park Golf Club" ||
      club.name === "Oakview Links"
    ) || [];

    const demoClubIds = demoClubs.map(c => c.id);
    console.log(`Found ${demoClubs.length} demo clubs to clean up`);

    // Delete in proper order due to foreign key constraints
    
    // 1. Delete claims first (using subquery approach)
    if (demoClubIds.length > 0) {
      // Get all entries from demo competitions first
      const { data: demoCompetitions } = await supabaseAdmin
        .from("competitions")
        .select("id")
        .in("club_id", demoClubIds);

      if (demoCompetitions && demoCompetitions.length > 0) {
        const demoCompetitionIds = demoCompetitions.map(c => c.id);
        
        // Get all entries from these competitions
        const { data: demoEntries } = await supabaseAdmin
          .from("entries")
          .select("id")
          .in("competition_id", demoCompetitionIds);

        if (demoEntries && demoEntries.length > 0) {
          const demoEntryIds = demoEntries.map(e => e.id);
          
          // Delete claims for these entries
          const { error: claimsError } = await supabaseAdmin
            .from("claims")
            .delete()
            .in("entry_id", demoEntryIds);

          if (claimsError && claimsError.code !== 'PGRST116') {
            console.error("Error deleting demo claims:", claimsError);
          } else {
            console.log("Deleted demo claims");
          }

          // Delete verifications for these entries
          const { error: verificationsError } = await supabaseAdmin
            .from("verifications")
            .delete()
            .in("entry_id", demoEntryIds);

          if (verificationsError && verificationsError.code !== 'PGRST116') {
            console.error("Error deleting demo verifications:", verificationsError);
          } else {
            console.log("Deleted demo verifications");
          }
        }

        // Delete entries from demo competitions
        const { error: entriesError } = await supabaseAdmin
          .from("entries")
          .delete()
          .in("competition_id", demoCompetitionIds);

        if (entriesError && entriesError.code !== 'PGRST116') {
          console.error("Error deleting demo entries:", entriesError);
        } else {
          console.log("Deleted demo entries");
        }
      }
    }

    // 4. Delete entries from demo players (if any remain)
    if (demoUserIds.length > 0) {
      const { error: playerEntriesError } = await supabaseAdmin
        .from("entries")
        .delete()
        .in("player_id", demoUserIds);

      if (playerEntriesError && playerEntriesError.code !== 'PGRST116') {
        console.error("Error deleting remaining demo player entries:", playerEntriesError);
      } else {
        console.log("Deleted remaining demo player entries");
      }
    }

    // 5. Delete competitions from demo clubs
    if (demoClubIds.length > 0) {
      const { error: competitionsError } = await supabaseAdmin
        .from("competitions")
        .delete()
        .in("club_id", demoClubIds);

      if (competitionsError && competitionsError.code !== 'PGRST116') {
        console.error("Error deleting demo competitions:", competitionsError);
      } else {
        console.log("Deleted demo competitions");
      }
    }

    // 6. Delete club banking records
    if (demoClubIds.length > 0) {
      const { error: bankingError } = await supabaseAdmin
        .from("club_banking")
        .delete()
        .in("club_id", demoClubIds);

      if (bankingError && bankingError.code !== 'PGRST116') {
        console.error("Error deleting demo club banking:", bankingError);
      } else {
        console.log("Deleted demo club banking records");
      }
    }

    // 7. Delete demo clubs
    if (demoClubIds.length > 0) {
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

    // 8. Delete leads from demo data
    const demoEmailPatterns = [
      '@holein1demo.test',
      '@demo.test',
      '@holein1.test'
    ];
    
    for (const pattern of demoEmailPatterns) {
      const { error: leadsError } = await supabaseAdmin
        .from("leads")
        .delete()
        .like("email", `%${pattern}`);

      if (leadsError && leadsError.code !== 'PGRST116') {
        console.error(`Error deleting demo leads for ${pattern}:`, leadsError);
      }
    }
    console.log("Deleted demo leads");

    // 9. Delete demo user profiles
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

    // 10. Delete auth users in batches (avoid timeout)
    const batchSize = 50;
    let deletedUsersCount = 0;
    
    for (let i = 0; i < demoUsers.length; i += batchSize) {
      const batch = demoUsers.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
          if (deleteError) {
            console.error(`Error deleting auth user ${user.email}:`, deleteError);
          } else {
            deletedUsersCount++;
            if (deletedUsersCount % 100 === 0) {
              console.log(`Deleted ${deletedUsersCount}/${demoUsers.length} auth users`);
            }
          }
        } catch (err) {
          console.error(`Error deleting auth user ${user.email}:`, err);
        }
      }
    }

    console.log(`Comprehensive demo data flush completed successfully`);
    console.log(`Summary:`);
    console.log(`- Auth users deleted: ${deletedUsersCount}`);
    console.log(`- Clubs deleted: ${demoClubs.length}`);
    console.log(`- Associated entries, competitions, claims, and verifications deleted`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Comprehensive demo data flushed successfully",
        summary: {
          deletedUsers: deletedUsersCount,
          deletedClubs: demoClubs.length,
          totalDemoUsersFound: demoUsers.length,
          totalDemoClubsFound: demoClubs.length
        }
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