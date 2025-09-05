import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
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
        throw new Error("Demo seeding not available in production without secret");
      }
      
      const { demoSecret: providedSecret }: SeedRequest = await req.json();
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

    console.log("Starting demo data seed...");

    // Demo user credentials
    const demoUsers = [
      {
        email: "admin@holein1.test",
        password: "Demo!2345",
        role: "ADMIN" as const,
        name: "Demo Admin"
      },
      {
        email: "club1@holein1.test", 
        password: "Demo!2345",
        role: "CLUB" as const,
        name: "Club Manager 1"
      },
      {
        email: "club2@holein1.test",
        password: "Demo!2345", 
        role: "CLUB" as const,
        name: "Club Manager 2"
      },
      {
        email: "player1@holein1.test",
        password: "Demo!2345",
        role: "PLAYER" as const,
        name: "Demo Player"
      }
    ];

    // Create auth users
    for (const user of demoUsers) {
      console.log(`Creating user: ${user.email}`);
      
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers.users?.some(u => u.email === user.email);
      
      if (!userExists) {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            first_name: user.name.split(' ')[0],
            last_name: user.name.split(' ').slice(1).join(' '),
            role: user.role
          }
        });

        if (authError) {
          console.error(`Error creating auth user ${user.email}:`, authError);
          continue;
        }

        console.log(`Created auth user: ${user.email} with ID: ${authUser.user?.id}`);
      } else {
        console.log(`User ${user.email} already exists`);
      }
    }

    // Create demo clubs
    const demoClubs = [
      {
        name: "Fairway Park Golf Club",
        email: "info@fairwaypark.test",
        phone: "+44 1234 567890",
        address: "123 Fairway Drive, Surrey, UK"
      },
      {
        name: "Oakview Links", 
        email: "contact@oakviewlinks.test",
        phone: "+44 1987 654321",
        address: "456 Oak Lane, Kent, UK"
      }
    ];

    const createdClubs = [];
    for (const club of demoClubs) {
      // Check if club already exists
      const { data: existingClub } = await supabaseAdmin
        .from("clubs")
        .select("id")
        .eq("email", club.email)
        .single();

      if (!existingClub) {
        const { data: newClub, error: clubError } = await supabaseAdmin
          .from("clubs")
          .insert(club)
          .select()
          .single();

        if (clubError) {
          console.error("Error creating club:", clubError);
          continue;
        }

        createdClubs.push(newClub);
        console.log(`Created club: ${club.name}`);
      } else {
        createdClubs.push(existingClub);
        console.log(`Club ${club.name} already exists`);
      }
    }

    // Update club users with club_id
    if (createdClubs.length >= 2) {
      // Get user IDs
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const club1User = users.users?.find(u => u.email === "club1@holein1.test");
      const club2User = users.users?.find(u => u.email === "club2@holein1.test");

      if (club1User && createdClubs[0]) {
        await supabaseAdmin
          .from("profiles")
          .upsert({
            id: club1User.id,
            email: club1User.email!,
            first_name: "Club Manager",
            last_name: "1",
            role: "CLUB",
            club_id: createdClubs[0].id
          });
      }

      if (club2User && createdClubs[1]) {
        await supabaseAdmin
          .from("profiles")
          .upsert({
            id: club2User.id,
            email: club2User.email!,
            first_name: "Club Manager", 
            last_name: "2",
            role: "CLUB",
            club_id: createdClubs[1].id
          });
      }
    }

    // Create demo competitions
    const now = new Date();
    const competitions = [
      {
        name: "Active Spring Challenge",
        description: "Currently running hole-in-one challenge",
        club_id: createdClubs[0]?.id,
        start_date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        end_date: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
        entry_fee: 2500, // £25
        prize_pool: 50000, // £500
        hole_number: 7,
        status: "ACTIVE" as const
      },
      {
        name: "Upcoming Summer Championship",
        description: "Premium championship event",
        club_id: createdClubs[0]?.id,
        start_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        end_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        entry_fee: 5000, // £50
        prize_pool: 100000, // £1000
        hole_number: 12,
        status: "SCHEDULED" as const
      },
      {
        name: "Completed Autumn Tournament",
        description: "Last week's tournament",
        club_id: createdClubs[1]?.id,
        start_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        end_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        entry_fee: 7500, // £75
        prize_pool: 150000, // £1500
        hole_number: 18,
        status: "ENDED" as const
      }
    ];

    const createdCompetitions = [];
    for (const comp of competitions) {
      if (!comp.club_id) continue;

      const { data: existingComp } = await supabaseAdmin
        .from("competitions")
        .select("id")
        .eq("name", comp.name)
        .single();

      if (!existingComp) {
        const { data: newComp, error: compError } = await supabaseAdmin
          .from("competitions")
          .insert(comp)
          .select()
          .single();

        if (compError) {
          console.error("Error creating competition:", compError);
          continue;
        }

        createdCompetitions.push(newComp);
        console.log(`Created competition: ${comp.name}`);
      } else {
        createdCompetitions.push(existingComp);
        console.log(`Competition ${comp.name} already exists`);
      }
    }

    // Create some demo entries
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const playerUser = users.users?.find(u => u.email === "player1@holein1.test");

    if (playerUser && createdCompetitions.length > 0) {
      // Create entry for the completed competition
      const completedComp = createdCompetitions.find(c => c.name === "Completed Autumn Tournament");
      if (completedComp) {
        const { data: existingEntry } = await supabaseAdmin
          .from("entries")
          .select("id")
          .eq("competition_id", completedComp.id)
          .eq("player_id", playerUser.id)
          .single();

        if (!existingEntry) {
          await supabaseAdmin
            .from("entries")
            .insert({
              competition_id: completedComp.id,
              player_id: playerUser.id,
              paid: true,
              entry_date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
              completed_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
              score: 3 // Close but no hole-in-one
            });

          console.log("Created demo entry for completed competition");
        }
      }
    }

    const credentials = {
      admin: { email: "admin@holein1.test", password: "Demo!2345" },
      club1: { email: "club1@holein1.test", password: "Demo!2345" },
      club2: { email: "club2@holein1.test", password: "Demo!2345" },
      player: { email: "player1@holein1.test", password: "Demo!2345" }
    };

    console.log("Demo data seeding completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Demo data seeded successfully",
        credentials 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in seed-demo-data:", error);
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