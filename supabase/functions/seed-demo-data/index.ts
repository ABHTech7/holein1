import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
  demoSecret?: string;
}

// Club name components for realistic variety
const clubPrefixes = [
  "Royal", "St.", "The", "Old", "New", "West", "East", "North", "South", "Green",
  "Highland", "Riverside", "Valley", "Park", "Forest", "Manor", "Country", "Premier"
];

const clubSuffixes = [
  "Golf Club", "Golf Course", "Links", "Country Club", "Golf Resort", "Golf Academy"
];

const clubMiddles = [
  "Oak", "Pine", "Birch", "Elm", "Willow", "Cedar", "Maple", "Ash", "Fairway", "Green",
  "Hill", "Dale", "Park", "View", "Ridge", "Meadow", "Brook", "Lake", "River", "Valley",
  "Heath", "Down", "Moor", "Wood", "Field", "Grange", "Manor", "Court", "Hall"
];

// Competition name components
const competitionPrefixes = [
  "Spring", "Summer", "Autumn", "Winter", "Annual", "Monthly", "Weekly", "Championship",
  "Open", "Masters", "Classic", "Premier", "Elite", "Professional", "Amateur", "Club"
];

const competitionSuffixes = [
  "Challenge", "Tournament", "Championship", "Cup", "Trophy", "Classic", "Open",
  "Masters", "Invitational", "Series", "Event", "Competition"
];

// UK addresses for clubs
const ukAddresses = [
  "Surrey", "Kent", "Essex", "Berkshire", "Hampshire", "Hertfordshire", "Buckinghamshire",
  "Oxfordshire", "West Sussex", "East Sussex", "Dorset", "Devon", "Cornwall", "Somerset",
  "Gloucestershire", "Wiltshire", "Bedfordshire", "Cambridgeshire", "Norfolk", "Suffolk"
];

// Player name components
const firstNames = [
  "James", "John", "Robert", "Michael", "David", "William", "Richard", "Thomas", "Mark", "Paul",
  "Andrew", "Kenneth", "Steven", "Edward", "Brian", "Ronald", "Anthony", "Kevin", "Jason", "Matthew",
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
  "Nancy", "Lisa", "Betty", "Helen", "Sandra", "Donna", "Carol", "Ruth", "Sharon", "Michelle"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"
];

// Email domains for variety
const emailDomains = [
  "gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com", "btinternet.com",
  "sky.com", "talktalk.net", "virgin.net", "aol.com"
];

// Helper functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateClubName(): string {
  const prefix = Math.random() > 0.7 ? getRandomElement(clubPrefixes) + " " : "";
  const middle = getRandomElement(clubMiddles);
  const suffix = getRandomElement(clubSuffixes);
  return `${prefix}${middle} ${suffix}`;
}

function generateCompetitionName(): string {
  const prefix = getRandomElement(competitionPrefixes);
  const suffix = getRandomElement(competitionSuffixes);
  return `${prefix} ${suffix}`;
}

function generatePlayerName(): { firstName: string; lastName: string; email: string } {
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const domain = getRandomElement(emailDomains);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomInt(1, 999)}@${domain}`;
  return { firstName, lastName, email };
}

function generateUKPhone(): string {
  const areaCode = getRandomInt(1000, 9999);
  const number = getRandomInt(100000, 999999);
  return `+44 ${areaCode} ${number}`;
}

function generateAddress(): string {
  const streetNumber = getRandomInt(1, 999);
  const streetName = getRandomElement(clubMiddles);
  const streetType = getRandomElement(["Road", "Lane", "Drive", "Avenue", "Close", "Way"]);
  const county = getRandomElement(ukAddresses);
  return `${streetNumber} ${streetName} ${streetType}, ${county}, UK`;
}

// Date helpers for realistic past dates (June-September 2024)
function getRandomDateInMonth(year: number, month: number): Date {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = getRandomInt(1, daysInMonth);
  const hour = getRandomInt(8, 18); // Business hours
  const minute = getRandomInt(0, 59);
  return new Date(year, month - 1, day, hour, minute);
}

function getDateRange(): { startDate: Date; endDate: Date; months: number[] } {
  const currentYear = new Date().getFullYear();
  const pastYear = currentYear - 1; // Use previous year for realistic demo data
  return {
    startDate: new Date(pastYear, 5, 1), // June 1, previous year
    endDate: new Date(pastYear, 8, 30), // September 30, previous year
    months: [6, 7, 8, 9] // June, July, August, September
  };
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

    console.log("Starting comprehensive demo data seed...");
    
    // Check if demo data already exists
    const { data: existingSession } = await supabaseAdmin
      .from("demo_data_sessions")
      .select("*")
      .eq("is_active", true)
      .eq("session_type", "seed")
      .single();
      
    if (existingSession) {
      console.log("Demo data already exists, cleaning up first...");
      
      // Clean up existing demo data
      const { data: cleanupResult } = await supabaseAdmin.rpc("cleanup_demo_data", { cleanup_all: true });
      console.log("Cleanup result:", cleanupResult);
    }

    // Create basic demo admin
    const adminUser = {
      email: "admin@holein1.test",
      password: "Demo!2345",
      role: "ADMIN" as const,
      name: "Demo Admin"
    };

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUsers.users?.some(u => u.email === adminUser.email);
    
    if (!adminExists) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminUser.email,
        password: adminUser.password,
        email_confirm: true,
        user_metadata: {
          first_name: "Demo",
          last_name: "Admin",
          role: adminUser.role
        }
      });

      if (authError) {
        console.error(`Error creating admin user:`, authError);
      } else {
        console.log(`Created admin user: ${adminUser.email}`);
      }
    }

    // Generate 18 new clubs
    console.log("Generating 18 clubs...");
    const clubsToCreate = [];
    for (let i = 0; i < 18; i++) {
      clubsToCreate.push({
        name: generateClubName(),
        email: `club${i + 1}@holein1demo.test`,
        phone: generateUKPhone(),
        address: generateAddress(),
        website: `https://club${i + 1}demo.com`,
        active: true,
        contract_signed: true,
        contract_signed_date: new Date().toISOString(),
        contract_signed_by_name: "Club Manager",
        contract_signed_by_email: `club${i + 1}@holein1demo.test`,
        is_demo_data: true
      });
    }

    // Insert clubs in batches
    const batchSize = 10;
    const createdClubs = [];
    for (let i = 0; i < clubsToCreate.length; i += batchSize) {
      const batch = clubsToCreate.slice(i, i + batchSize);
      const { data: clubBatch, error: clubError } = await supabaseAdmin
        .from("clubs")
        .insert(batch)
        .select();

      if (clubError) {
        console.error("Error creating club batch:", clubError);
        continue;
      }

      createdClubs.push(...(clubBatch || []));
      console.log(`Created clubs batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(clubsToCreate.length/batchSize)}`);
    }

    console.log(`Created ${createdClubs.length} clubs total`);

    // Generate competitions (1 per club)
    console.log("Generating competitions...");
    const competitionsToCreate = [];
    const { months } = getDateRange();
    
    for (const club of createdClubs) {
      const numCompetitions = 1;
      
      for (let i = 0; i < numCompetitions; i++) {
        // Random start date in past year (June-September)
        const month = getRandomElement(months);
        const { startDate: _, endDate: __, months: ___ } = getDateRange();
        const pastYear = new Date().getFullYear() - 1;
        const startDate = getRandomDateInMonth(pastYear, month);
        const endDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days later
        
        competitionsToCreate.push({
          name: generateCompetitionName(),
          description: `Professional hole-in-one competition at ${club.name}`,
          club_id: club.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          entry_fee: getRandomInt(1000, 10000), // £10-£100 in pence
          prize_pool: getRandomInt(50000, 500000), // £500-£5000
          hole_number: getRandomInt(1, 18),
          status: "ACTIVE",
          is_year_round: false,
          archived: false,
          is_demo_data: true
        });
      }
    }

    // Insert competitions in batches
    const createdCompetitions = [];
    for (let i = 0; i < competitionsToCreate.length; i += batchSize) {
      const batch = competitionsToCreate.slice(i, i + batchSize);
      const { data: compBatch, error: compError } = await supabaseAdmin
        .from("competitions")
        .insert(batch)
        .select();

      if (compError) {
        console.error("Error creating competition batch:", compError);
        continue;
      }

      createdCompetitions.push(...(compBatch || []));
      console.log(`Created competition batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(competitionsToCreate.length/batchSize)}`);
    }

    console.log(`Created ${createdCompetitions.length} competitions total`);

    // Generate players (reusable pool)
    console.log("Generating player pool...");
    const playersToCreate = [];
    const playerAuthUsers = [];
    
    for (let i = 0; i < 1000; i++) {
      const { firstName, lastName, email } = generatePlayerName();
      
      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: "Demo!2345",
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "PLAYER"
        }
      });

      if (authError) {
        console.error(`Error creating player auth user ${email}:`, authError);
        continue;
      }

      playerAuthUsers.push(authUser.user!);
      
      playersToCreate.push({
        id: authUser.user!.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: "PLAYER",
        age_years: getRandomInt(18, 75),
        handicap: getRandomInt(-5, 28),
        phone: generateUKPhone(),
        phone_e164: generateUKPhone(),
        consent_marketing: Math.random() > 0.5,
        status: "active",
        is_demo_data: true
      });

      if (i % 100 === 0) {
        console.log(`Created ${i + 1}/1000 players`);
      }
    }

    // Insert player profiles in batches
    const createdPlayers = [];
    for (let i = 0; i < playersToCreate.length; i += batchSize) {
      const batch = playersToCreate.slice(i, i + batchSize);
      const { data: playerBatch, error: playerError } = await supabaseAdmin
        .from("profiles")
        .upsert(batch)
        .select();

      if (playerError) {
        console.error("Error creating player batch:", playerError);
        continue;
      }

      createdPlayers.push(...(playerBatch || []));
    }

    console.log(`Created ${createdPlayers.length} players total`);

    // Generate entries (50-60 per month per competition)
    console.log("Generating entries...");
    const entriesToCreate = [];
    const { months: targetMonths } = getDateRange();

    for (const competition of createdCompetitions) {
      // Generate entries for each month in past year
      for (const month of targetMonths) {
        const entriesThisMonth = getRandomInt(50, 60);
        
        for (let i = 0; i < entriesThisMonth; i++) {
          const randomPlayer = getRandomElement(createdPlayers);
          const pastYear = new Date().getFullYear() - 1;
          const entryDate = getRandomDateInMonth(pastYear, month);
          
          entriesToCreate.push({
            competition_id: competition.id,
            player_id: randomPlayer.id,
            entry_date: entryDate.toISOString(),
            paid: true,
            payment_date: entryDate.toISOString(),
            amount_minor: competition.entry_fee,
            terms_accepted_at: entryDate.toISOString(),
            terms_version: "v1.0",
            status: "completed",
            outcome_self: "miss", // Will update winners later
            outcome_reported_at: new Date(entryDate.getTime() + (2 * 60 * 60 * 1000)).toISOString(), // 2 hours after entry
            is_demo_data: true,
            email: randomPlayer.email // Add player email for proper RLS
          });
        }
      }
    }

    console.log(`Preparing to create ${entriesToCreate.length} entries...`);

    // Insert entries in larger batches (this is the biggest dataset)
    const entryBatchSize = 100;
    const createdEntries = [];
    for (let i = 0; i < entriesToCreate.length; i += entryBatchSize) {
      const batch = entriesToCreate.slice(i, i + entryBatchSize);
      const { data: entryBatch, error: entryError } = await supabaseAdmin
        .from("entries")
        .insert(batch)
        .select();

      if (entryError) {
        console.error("Error creating entry batch:", entryError);
        continue;
      }

      createdEntries.push(...(entryBatch || []));
      
      if (i % 1000 === 0) {
        console.log(`Created ${i + entryBatchSize}/~ ${entriesToCreate.length} entries`);
      }
    }

    console.log(`Created ${createdEntries.length} entries total`);

    // Create winners (1 per competition)
    console.log("Creating winners and claims...");
    const winnersToUpdate = [];
    const verificationsToCreate = [];
    const claimsToCreate = [];

    for (const competition of createdCompetitions) {
      // Find a random entry for this competition to make a winner
      const competitionEntries = createdEntries.filter(e => e.competition_id === competition.id);
      if (competitionEntries.length === 0) continue;

      const winnerEntry = getRandomElement(competitionEntries);
      
      // Update entry to be a winner
      winnersToUpdate.push({
        id: winnerEntry.id,
        outcome_self: "win",
        status: "completed",
        score: 1 // Hole in one!
      });

      // Create verification record
      verificationsToCreate.push({
        entry_id: winnerEntry.id,
        witnesses: [{
          name: "Club Staff Member",
          contact: generateUKPhone(),
          relationship: "Staff"
        }],
        status: "approved",
        verified_at: new Date().toISOString(),
        social_consent: true,
        evidence_captured_at: new Date().toISOString()
      });

      // Create approved claim
      claimsToCreate.push({
        entry_id: winnerEntry.id,
        hole_number: competition.hole_number,
        status: "APPROVED",
        verified_at: new Date().toISOString(),
        witness_name: "Club Staff Member",
        witness_contact: generateUKPhone(),
        notes: "Verified hole-in-one with video evidence and witness confirmation"
      });
    }

    // Update winner entries
    for (const winner of winnersToUpdate) {
      await supabaseAdmin
        .from("entries")
        .update({
          outcome_self: winner.outcome_self,
          status: winner.status,
          score: winner.score
        })
        .eq("id", winner.id);
    }

    // Create verifications
    await supabaseAdmin
      .from("verifications")
      .insert(verificationsToCreate);

    // Create approved claims
    await supabaseAdmin
      .from("claims")
      .insert(claimsToCreate);

    // Create additional claims under review (1 per club)
    const pendingClaimsToCreate = [];
    for (const club of createdClubs.slice(0, 38)) { // One per club
      const clubCompetitions = createdCompetitions.filter(c => c.club_id === club.id);
      if (clubCompetitions.length === 0) continue;

      const competition = getRandomElement(clubCompetitions);
      const competitionEntries = createdEntries.filter(e => e.competition_id === competition.id);
      if (competitionEntries.length === 0) continue;

      const claimEntry = getRandomElement(competitionEntries);
      
      // Update entry to pending claim
      await supabaseAdmin
        .from("entries")
        .update({
          outcome_self: "win",
          status: "verification_pending"
        })
        .eq("id", claimEntry.id);

      // Create pending verification
      await supabaseAdmin
        .from("verifications")
        .insert({
          entry_id: claimEntry.id,
          witnesses: [{
            name: "Playing Partner",
            contact: generateUKPhone(),
            relationship: "Fellow Player"
          }],
          status: "pending",
          social_consent: true,
          evidence_captured_at: new Date().toISOString()
        });

      // Create pending claim
      pendingClaimsToCreate.push({
        entry_id: claimEntry.id,
        hole_number: competition.hole_number,
        status: "PENDING",
        witness_name: "Playing Partner",
        witness_contact: generateUKPhone(),
        notes: "Claim submitted, awaiting club verification"
      });
    }

    await supabaseAdmin
      .from("claims")
      .insert(pendingClaimsToCreate);

    console.log(`Created ${winnersToUpdate.length} winners`);
    console.log(`Created ${pendingClaimsToCreate.length} pending claims`);

    const credentials = {
      admin: { email: "admin@holein1.test", password: "Demo!2345" },
      samplePlayer: { email: createdPlayers[0]?.email || "player@demo.test", password: "Demo!2345" }
    };

    // Create demo data session record
    const sessionData = {
      session_type: "seed",
      created_by: null, // System created
      entities_created: {
        clubs: createdClubs.length,
        competitions: createdCompetitions.length,
        players: createdPlayers.length,
        entries: createdEntries.length,
        winners: winnersToUpdate.length,
        pending_claims: pendingClaimsToCreate.length
      },
      notes: `Generated comprehensive demo data with realistic ${new Date().getFullYear() - 1} dates`
    };

    await supabaseAdmin
      .from("demo_data_sessions")
      .insert(sessionData);

    console.log("Comprehensive demo data seeding completed!");
    console.log(`Summary:`);
    console.log(`- Clubs: ${createdClubs.length}`);
    console.log(`- Competitions: ${createdCompetitions.length}`);
    console.log(`- Players: ${createdPlayers.length}`);
    console.log(`- Entries: ${createdEntries.length}`);
    console.log(`- Winners: ${winnersToUpdate.length}`);
    console.log(`- Pending Claims: ${pendingClaimsToCreate.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Comprehensive demo data seeded successfully",
        summary: {
          clubs: createdClubs.length,
          competitions: createdCompetitions.length,
          players: createdPlayers.length,
          entries: createdEntries.length,
          winners: winnersToUpdate.length,
          pending_claims: pendingClaimsToCreate.length
        },
        credentials: {
          admin: adminUser,
          club1: { email: "club1@holein1demo.test", password: "Demo!2345" },
          club2: { email: "club2@holein1demo.test", password: "Demo!2345" },
          player: { email: createdPlayers[0]?.email || "demo.player@example.com", password: "Demo!2345" }
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in comprehensive seed-demo-data:", error);
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