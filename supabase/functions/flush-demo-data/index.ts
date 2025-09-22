import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Utility: chunk array into batches to avoid Cloudflare 414 issues
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Utility: perform batched deletes using .in(column, values)
async function deleteInBatches(
  supabase: any,
  table: string,
  column: string,
  values: string[],
  batchSize = 200
): Promise<void> {
  if (!values || values.length === 0) return;
  for (const batch of chunkArray(values, batchSize)) {
    const { error } = await supabase.from(table).delete().in(column, batch);
    if (error && error.code !== 'PGRST116') {
      console.error(`Error deleting from ${table} (${column}) batch:`, error);
    }
  }
}

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
      .from("clubs")
      .select("id, name, email, created_at");

    if (recentOnly) {
      clubQuery = clubQuery.gte("created_at", thresholdIso);
    }

    const { data: allClubs, error: clubsFetchError } = await clubQuery;

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
    // List all auth users with pagination to avoid missing users beyond first page
    const allUsersList: any[] = [];
    try {
      const perPage = 1000;
      for (let page = 1; page <= 50; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.error(`Error listing users (page ${page}):`, error);
          break;
        }
        const users = data?.users ?? [];
        allUsersList.push(...users);
        if (users.length < perPage) break; // last page
      }
      console.log(`Loaded ${allUsersList.length} auth users across pages`);
    } catch (e) {
      console.error("Error listing users:", e);
    }
    
    // Demo users include:
    // 1. Users with demo email patterns (old small demo set)
    // 2. Users who are players in demo competitions (the 2000 generated players)
    const preservedDemoEmails = [
      "admin@holein1.test",
      "club1@holein1.test", 
      "club2@holein1.test",
      "player1@holein1.test"
    ];

    let demoUsers = allUsersList.filter((u: any) => {
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

    const targetUserIds = new Set<string>();
    // If recentOnly, include ALL players created in last 3 hours OR who created entries in last 3 hours
    let recentEntryIds: string[] = [];
    if (recentOnly) {
      // 1) Recent entries (last 3h)
      const { data: recentEntries, error: recentEntriesError } = await supabaseAdmin
        .from("entries")
        .select("id, player_id, competition_id, created_at")
        .gte("created_at", thresholdIso);
      if (recentEntriesError) {
        console.error("Error fetching recent entries:", recentEntriesError);
      }
      const recentPlayerIdsFromEntries = [...new Set((recentEntries || []).map(e => e.player_id))];
      recentEntryIds = (recentEntries || []).map(e => e.id);

      // 2) Recent PLAYER profiles (last 3h)
      const { data: recentProfiles, error: recentProfilesError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "PLAYER")
        .gte("created_at", thresholdIso);
      if (recentProfilesError) {
        console.error("Error fetching recent profiles:", recentProfilesError);
      }
      const recentPlayerIdsFromProfiles = (recentProfiles || []).map(p => p.id);

      const unionRecentPlayerIds = new Set<string>([
        ...recentPlayerIdsFromEntries,
        ...recentPlayerIdsFromProfiles,
      ]);

      console.log(`Recent-only scope: ${recentEntries?.length || 0} entries, ${recentPlayerIdsFromProfiles.length} recent player profiles, ${unionRecentPlayerIds.size} unique players`);

      if (unionRecentPlayerIds.size > 0) {
        for (const id of unionRecentPlayerIds) targetUserIds.add(id);
        console.log(`Including ${unionRecentPlayerIds.size} players for deletion in recent-only mode`);
      }
    }

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
          .select("player_id, id")
          .in("competition_id", demoCompetitionIds);

        if (demoPlayerEntries && demoPlayerEntries.length > 0) {
          const demoPlayerIds = [...new Set(demoPlayerEntries.map(e => e.player_id))];
          
          // Add these users to target set
          for (const id of demoPlayerIds) targetUserIds.add(id);

          // Merge entry ids so we can delete by explicit entry id too
          recentEntryIds = [...new Set([
            ...recentEntryIds,
            ...demoPlayerEntries.map(e => e.id)
          ])];
        }
      }
    }
    
    // Add pattern-matched users into target set as well
    for (const u of demoUsers) targetUserIds.add(u.id);
    const demoUserIds = Array.from(targetUserIds);
    console.log(`Found ${demoUserIds.length} demo users to clean up (targeted by IDs)`);


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
          
          // Delete claims and verifications for these entries in batches to avoid URI too large
          await deleteInBatches(supabaseAdmin, "claims", "entry_id", demoEntryIds);
          await deleteInBatches(supabaseAdmin, "verifications", "entry_id", demoEntryIds);
          console.log("Deleted demo claims and verifications");
        }

        // Delete entries from demo competitions in batches
        await deleteInBatches(supabaseAdmin, "entries", "competition_id", demoCompetitionIds);
        console.log("Deleted demo entries");
      }
    }

    // Delete by recent-only entries if applicable
    if (recentOnly && recentEntryIds.length > 0) {
      try {
        await deleteInBatches(supabaseAdmin, "claims", "entry_id", recentEntryIds);
        await deleteInBatches(supabaseAdmin, "verifications", "entry_id", recentEntryIds);
        await deleteInBatches(supabaseAdmin, "entries", "id", recentEntryIds);
        console.log(`Deleted ${recentEntryIds.length} recent entries`);
      } catch (e) {
        console.error("Error during recent-only entry cleanup:", e);
      }
    }

    // 4. Delete entries from demo players (if any remain)
    if (demoUserIds.length > 0) {
      await deleteInBatches(supabaseAdmin, "entries", "player_id", demoUserIds);
      console.log("Deleted remaining demo player entries");
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
      await deleteInBatches(supabaseAdmin, "profiles", "id", demoUserIds);
      console.log("Deleted demo profiles");
    }

    // 10. Delete auth users in batches (avoid timeout)
    const batchSize = 50;
    let deletedUsersCount = 0;
    
    for (let i = 0; i < demoUserIds.length; i += batchSize) {
      const batch = demoUserIds.slice(i, i + batchSize);
      
      for (const userId of batch) {
        try {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (deleteError) {
            console.error(`Error deleting auth user ${userId}:`, deleteError);
          } else {
            deletedUsersCount++;
            if (deletedUsersCount % 100 === 0) {
              console.log(`Deleted ${deletedUsersCount}/${demoUserIds.length} auth users`);
            }
          }
        } catch (err) {
          console.error(`Error deleting auth user ${userId}:`, err);
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
          totalDemoUsersFound: demoUserIds.length,
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