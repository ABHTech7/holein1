import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TargetedDemoRequest {
  clubIds: string[];
  competitionsPerClub: number;
  playersPerClub: number;
  entriesPerCompetition: number;
  winRate: number;
  markClubsAsDemo: boolean;
}

// Helper functions
const firstNames = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Andrew", "Kenneth", "Joshua", "Kevin", "Brian", "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Benjamin", "Samuel", "Raymond", "Gregory", "Alexander", "Patrick", "Jack", "Dennis", "Jerry", "Tyler", "Aaron", "Jose", "Adam"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter"];

const getRandomElement = <T,>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const generatePlayerName = () => ({
  firstName: getRandomElement(firstNames),
  lastName: getRandomElement(lastNames),
});

const sanitizeForEmail = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const generateUKPhone = (): string => {
  const areaCode = getRandomElement(['7911', '7700', '7400', '7500', '7600']);
  const number = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `0${areaCode}${number}`;
};

const generatePastDate = (minDaysAgo: number, maxDaysAgo: number): Date => {
  const daysAgo = getRandomInt(minDaysAgo, maxDaysAgo);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(getRandomInt(9, 17), getRandomInt(0, 59), getRandomInt(0, 59));
  return date;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const body: TargetedDemoRequest = await req.json();
    const { 
      clubIds, 
      competitionsPerClub, 
      playersPerClub, 
      entriesPerCompetition, 
      winRate,
      markClubsAsDemo 
    } = body;

    console.log("Starting targeted club demo data generation:", {
      clubIds,
      competitionsPerClub,
      playersPerClub,
      entriesPerCompetition,
      winRate,
      markClubsAsDemo
    });

    // Validate clubs exist
    const { data: clubs, error: clubsError } = await supabaseAdmin
      .from('clubs')
      .select('id, name')
      .in('id', clubIds);

    if (clubsError) throw clubsError;
    if (!clubs || clubs.length === 0) {
      throw new Error('No valid clubs found');
    }

    console.log(`Found ${clubs.length} clubs to populate`);

    // Mark clubs as demo if requested
    if (markClubsAsDemo) {
      const { error: markError } = await supabaseAdmin
        .from('clubs')
        .update({ is_demo_data: true })
        .in('id', clubIds);
      
      if (markError) console.error('Error marking clubs as demo:', markError);
    }

    let totalCompetitions = 0;
    let totalPlayers = 0;
    let totalEntries = 0;

    // Process each club
    for (const club of clubs) {
      console.log(`Processing club: ${club.name}`);

      // Create competitions for this club
      const competitions = [];
      const timestamp = Date.now();
      for (let i = 0; i < competitionsPerClub; i++) {
        const startDate = generatePastDate(30, 90);
        const uniqueSuffix = `${timestamp}-${i}`;
        competitions.push({
          club_id: club.id,
          name: `${club.name} - Challenge ${uniqueSuffix}`,
          description: `Demo competition at ${club.name}`,
          start_date: startDate.toISOString(),
          end_date: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'ACTIVE',
          entry_fee: getRandomElement([10, 15, 20, 25]),
          prize_pool: getRandomElement([1000, 5000, 10000]),
          hole_number: getRandomInt(1, 18),
          is_demo_data: true,
          is_year_round: false,
        });
      }

      let competitionsToUse: any[] = [];
      let createdCompetitionsCount = 0;
      const { data: createdCompetitions, error: compError } = await supabaseAdmin
        .from('competitions')
        .insert(competitions)
        .select();

      if (compError) {
        console.error('Error creating competitions:', compError);
        // Fallback: use existing competitions for this club
        const { data: existingComps, error: existingCompErr } = await supabaseAdmin
          .from('competitions')
          .select('id, entry_fee')
          .eq('club_id', club.id)
          .eq('archived', false)
          .in('status', ['ACTIVE', 'SCHEDULED']);
        if (existingCompErr) {
          console.error('Fallback fetch competitions failed:', existingCompErr);
        }
        competitionsToUse = existingComps || [];
      } else {
        competitionsToUse = createdCompetitions || [];
        createdCompetitionsCount = competitionsToUse.length;
        totalCompetitions += createdCompetitionsCount;
        console.log(`Created ${createdCompetitionsCount} competitions for ${club.name}`);
      }

      if (competitionsToUse.length === 0) {
        console.warn('No competitions available for club:', club.name);
        continue;
      }

      // Create players for this club
      const players = [];
      for (let i = 0; i < playersPerClub; i++) {
        const { firstName, lastName } = generatePlayerName();
        const email = `${sanitizeForEmail(firstName)}.${sanitizeForEmail(lastName)}.${getRandomInt(1, 9999)}@demo-golfer.test`;
        const registrationDate = generatePastDate(1, 90);

        players.push({
          id: crypto.randomUUID(),
          email,
          first_name: firstName,
          last_name: lastName,
          phone: generateUKPhone(),
          age_years: getRandomInt(18, 75),
          gender: getRandomElement(['male', 'female']),
          handicap: getRandomInt(0, 36),
          club_id: club.id,
          role: 'PLAYER',
          is_demo_data: true,
          created_at: registrationDate.toISOString(),
        });
      }

      let playersToUse: any[] = [];
      let createdPlayers: any[] = [];
      let playersCreatedCount = 0;
      const { data: insertedPlayers, error: playersError } = await supabaseAdmin
        .from('profiles')
        .insert(players)
        .select();

      if (playersError) {
        console.error('Error creating players:', playersError);
        // Fallback: use existing players for this club
        const { data: existingPlayers, error: existingPlayersErr } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('club_id', club.id)
          .eq('role', 'PLAYER')
          .eq('status', 'active')
          .limit(playersPerClub);
        if (existingPlayersErr) {
          console.error('Fallback fetch players failed:', existingPlayersErr);
        }
        playersToUse = existingPlayers || [];
      } else {
        createdPlayers = insertedPlayers || [];
        playersToUse = createdPlayers;
        playersCreatedCount = createdPlayers.length;
        totalPlayers += playersCreatedCount;
        console.log(`Created ${playersCreatedCount} players for ${club.name}`);
      }

      if (playersToUse.length === 0) {
        console.warn('No players available for club:', club.name);
        continue;
      }

      // Create entries for each competition
      for (const competition of competitionsToUse) {
        const entries = [];
        const usedPlayers = new Set<string>();

        for (let i = 0; i < entriesPerCompetition; i++) {
          let player;
          let attempts = 0;
          do {
            player = getRandomElement(playersToUse);
            attempts++;
          } while (usedPlayers.has(player.id) && attempts < 100);

          if (attempts >= 100) break;
          usedPlayers.add(player.id);

          const entryDate = generatePastDate(1, 60);
          const isWin = Math.random() < winRate;

          entries.push({
            player_id: player.id,
            competition_id: competition.id,
            email: player.email,
            entry_date: entryDate.toISOString(),
            outcome_self: isWin ? 'win' : 'miss',
            outcome_reported_at: entryDate.toISOString(),
            status: isWin ? 'verification_pending' : 'completed',
            paid: true,
            payment_date: entryDate.toISOString(),
            price_paid: competition.entry_fee,
            is_demo_data: true,
          });
        }

        const { data: createdEntries, error: entriesError } = await supabaseAdmin
          .from('entries')
          .insert(entries)
          .select();

        if (entriesError) {
          console.error('Error creating entries:', entriesError);
          continue;
        }

        totalEntries += createdEntries.length;

        // Create verifications for wins
        const winEntries = createdEntries.filter(e => e.outcome_self === 'win');
        if (winEntries.length > 0) {
          const verifications = winEntries.map(entry => ({
            entry_id: entry.id,
            status: 'pending',
            witnesses: [],
            social_consent: false,
          }));

          await supabaseAdmin.from('verifications').insert(verifications);
        }
      }
    }

    console.log('Targeted demo data generation completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Demo data created for ${clubs.length} club(s)`,
        summary: {
          clubs: clubs.length,
          competitions: totalCompetitions,
          players: totalPlayers,
          entries: totalEntries,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Targeted demo data error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to generate targeted demo data"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
