import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlushRequest {
  demoSecret?: string;
  recentOnly?: boolean; // Only flush data created in the last 3 hours
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment check
    const isDevelopment = Deno.env.get("NODE_ENV") !== "production";
    const demoSecret = Deno.env.get("DEMO_SEED_SECRET");
    
    let recentOnly = false;
    
    // Parse request body once
    let requestBody: FlushRequest = {};
    try {
      requestBody = await req.json();
    } catch {
      // No body or invalid JSON, use defaults
    }
    
    if (!isDevelopment) {
      if (!demoSecret) {
        throw new Error("Demo flushing not available in production without secret");
      }
      
      if (requestBody.demoSecret !== demoSecret) {
        throw new Error("Invalid demo secret");
      }
    }
    
    recentOnly = requestBody.recentOnly || false;

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

    console.log(`Starting ${recentOnly ? 'recent' : 'comprehensive'} demo data flush...`);

    // Calculate timestamp threshold for recent-only flushes (last 3 hours)
    const recentThreshold = new Date();
    recentThreshold.setHours(recentThreshold.getHours() - 3);
    const thresholdIso = recentThreshold.toISOString();

    // Get all demo clubs first (they have the demo email pattern)
    let clubQuery = supabaseAdmin
      .from("clubs");

    if (recentOnly) {
      clubQuery = clubQuery.gte("created_at", thresholdIso);
    }

    const { data: allClubs, error: clubsFetchError } = await clubQuery
      .select("id, name, email, created_at");

    if (clubsFetchError) {
      console.error("Error fetching clubs:", clubsFetchError);
    }

    const demoClubs = allClubs?.filter(club => 
      club.email?.includes('@holein1demo.test') ||
      club.email?.includes('@demo.test') ||
      club.name === "Fairway Park Golf Club" ||
      club.name === "Oakview Links"
    ) || [];

    const demoClubIds = demoClubs.map(c => c.id);
    console.log(`Found ${demoClubs.length} demo clubs to clean up`);

    // Get ALL demo users - they use regular email domains but were created in batches
    // We'll identify them by finding users created recently with the demo password pattern
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    // Demo users include:
    // 1. Users with demo email patterns (old small demo set)
    // 2. Users who are players in demo competitions (the 2000 generated players)
    const preservedDemoEmails = [
      "admin@holein1.test",
      "club1@holein1.test", 
      "club2@holein1.test",
      "player1@holein1.test"
    ];

    let demoUsers = allUsers.users?.filter(u => {
      const matchesEmailPattern = u.email?.includes('@holein1demo.test') || 
        u.email?.includes('@demo.test') ||
        preservedDemoEmails.includes(u.email!);
      
      if (recentOnly) {
        // Only include users created after the threshold
        const userCreatedAt = new Date(u.created_at);
        return matchesEmailPattern && userCreatedAt >= recentThreshold;
      }
      
      return matchesEmailPattern;
    }) || [];

    // Also find all players who have entries in demo competitions
    if (demoClubIds.length > 0) {
      // Get all competitions from demo clubs
      const { data: demoCompetitions } = await supabaseAdmin
        .from("competitions")
        .select("id")
        .in("club_id", demoClubIds);

      if (demoCompetitions && demoCompetitions.length > 0) {
        const demoCompetitionIds = demoCompetitions.map(c => c.id);
        
        // Get all players who have entries in these competitions
        const { data: demoPlayerEntries } = await supabaseAdmin
          .from("entries")
          .select("player_id")
          .in("competition_id", demoCompetitionIds);

        if (demoPlayerEntries && demoPlayerEntries.length > 0) {
          const demoPlayerIds = [...new Set(demoPlayerEntries.map(e => e.player_id))];
          
          // Add these users to our demo users list
          const additionalDemoUsers = allUsers.users?.filter(u => 
            demoPlayerIds.includes(u.id)
          ) || [];
          
          // Combine and deduplicate
          const allDemoUserIds = new Set([
            ...demoUsers.map(u => u.id),
            ...additionalDemoUsers.map(u => u.id)
          ]);
          
          demoUsers = allUsers.users?.filter(u => allDemoUserIds.has(u.id)) || [];
        }
      }
    }
    
    const demoUserIds = demoUsers.map(u => u.id);
    console.log(`Found ${demoUsers.length} demo users to clean up`);

    // demoClubIds already computed above; avoiding redeclaration to prevent runtime errors

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
        deletedUsers: deletedUsersCount,
        deletedClubs: demoClubs.length,
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