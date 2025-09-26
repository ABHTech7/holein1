import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopUpRequest {
  demoSecret?: string;
  targetClubs?: number;
  targetPlayers?: number;
  targetEntries?: number;
}

// Helper functions
const clubPrefixes = [
  'Royal', 'Old', 'New', 'St', 'Mount', 'Glen', 'Loch', 'Forest', 
  'Valley', 'Hill', 'Park', 'Green', 'Oak', 'Pine', 'Cedar', 'Willow'
];

const clubSuffixes = [
  'Golf Club', 'Golf Course', 'Country Club', 'Links', 'Resort', 
  'Golf Resort', 'Golf & Country Club', 'Golf Links'
];

const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
  'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
  'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
  'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra',
  'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Kimberly',
  'Deborah', 'Dorothy', 'Amy', 'Angela', 'Ashley', 'Brenda', 'Emma'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
  'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera',
  'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans'
];

const ukAddresses = [
  'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Leeds, UK', 'Glasgow, UK',
  'Liverpool, UK', 'Newcastle, UK', 'Sheffield, UK', 'Bristol, UK', 'Edinburgh, UK',
  'Leicester, UK', 'Coventry, UK', 'Bradford, UK', 'Cardiff, UK', 'Belfast, UK'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateClubName(): string {
  const prefix = getRandomElement(clubPrefixes);
  const suffix = getRandomElement(clubSuffixes);
  return `${prefix} ${suffix}`;
}

function generatePlayerName(): { firstName: string; lastName: string } {
  return {
    firstName: getRandomElement(firstNames),
    lastName: getRandomElement(lastNames)
  };
}

function generateUKPhone(): string {
  const areaCode = getRandomElement(['01234', '01483', '0161', '0113', '0141']);
  const number = Math.floor(Math.random() * 900000) + 100000;
  return `${areaCode} ${number}`;
}

function sanitizeForEmail(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .slice(0, 20); // Limit length
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment check for production
    const nodeEnv = Deno.env.get('NODE_ENV');
    const demoSecret = Deno.env.get('DEMO_SEED_SECRET');

    let body: TopUpRequest = {};
    try {
      body = await req.json();
    } catch {
      // Default values if no body provided
    }

    // Validate demo secret in production
    if (nodeEnv === 'production' && (!demoSecret || body.demoSecret !== demoSecret)) {
      return new Response(
        JSON.stringify({ error: 'Invalid demo secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current demo stats
    const { data: statsData } = await supabaseAdmin.rpc('get_demo_data_stats');
    
    if (!statsData || statsData.length === 0) {
      throw new Error('Failed to get current demo data stats');
    }

    const stats = statsData[0];
    const targetClubs = body.targetClubs || 20;
    const targetPlayers = body.targetPlayers || 500;
    const targetEntries = body.targetEntries || 1200;

    let createdClubs = 0;
    let createdPlayers = 0;
    let createdEntries = 0;

    // Calculate what we need to create
    const clubsNeeded = Math.max(0, targetClubs - (stats.demo_clubs || 0));
    const playersNeeded = Math.max(0, targetPlayers - (stats.demo_profiles || 0));
    const entriesNeeded = Math.max(0, targetEntries - (stats.demo_entries || 0));

    console.log('Top-up needed:', { clubsNeeded, playersNeeded, entriesNeeded });

    // Create additional clubs if needed
    if (clubsNeeded > 0) {
      const clubsToCreate = [];
      for (let i = 0; i < clubsNeeded; i++) {
        const clubName = generateClubName();
        const sanitizedName = sanitizeForEmail(clubName);
        
        clubsToCreate.push({
          name: clubName,
          email: `${sanitizedName}@demo-golf-club.test`,
          phone: generateUKPhone(),
          address: getRandomElement(ukAddresses),
          active: true,
          is_demo_data: true
        });
      }

      const { data: newClubs, error: clubError } = await supabaseAdmin
        .from('clubs')
        .insert(clubsToCreate)
        .select();

      if (clubError) throw clubError;
      createdClubs = newClubs?.length || 0;

      // Create competitions for new clubs
      if (newClubs && newClubs.length > 0) {
        const competitionsToCreate = newClubs.map(club => ({
          club_id: club.id,
          name: `${club.name} Hole-in-One Challenge`,
          description: 'Professional hole-in-one competition with insurance coverage',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          status: 'ACTIVE',
          entry_fee: getRandomInt(10, 50),
          prize_pool: getRandomInt(1000, 10000),
          hole_number: getRandomInt(1, 18),
          is_year_round: true,
          is_demo_data: true
        }));

        await supabaseAdmin
          .from('competitions')
          .insert(competitionsToCreate);
      }
    }

// Create additional players if needed with batch processing
    if (playersNeeded > 0) {
      console.log(`Starting to create ${playersNeeded} demo players in batches...`);
      
      // Process in batches of 25 to avoid timeouts
      const batchSize = 25;
      const totalBatches = Math.ceil(playersNeeded / batchSize);
      const allCreatedPlayers: any[] = [];

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, playersNeeded);
        const batchPlayersCount = end - start;
        
        console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batchPlayersCount} players)...`);

        const batchPlayersToCreate: any[] = [];
        const batchAuthUsersToCreate: any[] = [];

        // Generate data for this batch
        for (let i = 0; i < batchPlayersCount; i++) {
          const player = generatePlayerName();
          const email = `demo.player.${Date.now()}.${start + i}@demo-golfer.test`;
          
          batchAuthUsersToCreate.push({
            email,
            password: 'DemoPlayer123!',
            email_confirm: true
          });

          batchPlayersToCreate.push({
            email,
            first_name: player.firstName,
            last_name: player.lastName,
            phone: generateUKPhone(),
            phone_e164: `+44${Math.floor(Math.random() * 1000000000)}`,
            role: 'PLAYER',
            age_years: getRandomInt(18, 75),
            handicap: getRandomInt(0, 36),
            gender: Math.random() > 0.5 ? 'male' : 'female',
            is_demo_data: true
          });
        }

        // Create auth users for this batch with retry logic
        const batchCreatedUsers: any[] = [];
        
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            // Create auth users in parallel for better performance
            const authPromises = batchAuthUsersToCreate.map(async (authUser, index) => {
              try {
                const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                  email: authUser.email,
                  password: authUser.password,
                  email_confirm: authUser.email_confirm
                });

                if (authError || !newUser.user) {
                  console.error(`Failed to create auth user ${authUser.email}:`, authError);
                  return null;
                }

                return { user: newUser.user, index };
              } catch (error) {
                console.error(`Error creating auth user ${authUser.email}:`, error);
                return null;
              }
            });

            const authResults = await Promise.all(authPromises);
            
            // Process successful auth user creations
            authResults.forEach(result => {
              if (result && result.user) {
                batchPlayersToCreate[result.index].id = result.user.id;
                batchCreatedUsers.push(batchPlayersToCreate[result.index]);
              }
            });

            console.log(`Batch ${batchIndex + 1}: Successfully created ${batchCreatedUsers.length}/${batchPlayersCount} auth users`);
            break; // Success, exit retry loop
            
          } catch (error) {
            console.error(`Batch ${batchIndex + 1} attempt ${attempt + 1} failed:`, error);
            if (attempt === 2) {
              console.error(`Batch ${batchIndex + 1}: All retry attempts failed`);
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        // Create profiles for successful auth users
        if (batchCreatedUsers.length > 0) {
          try {
            const { data: newPlayers, error: playerError } = await supabaseAdmin
              .from('profiles')
              .insert(batchCreatedUsers)
              .select();

            if (playerError) {
              console.error(`Failed to create profiles for batch ${batchIndex + 1}:`, playerError);
            } else {
              allCreatedPlayers.push(...(newPlayers || []));
              console.log(`Batch ${batchIndex + 1}: Successfully created ${newPlayers?.length || 0} profiles`);
            }
          } catch (error) {
            console.error(`Error creating profiles for batch ${batchIndex + 1}:`, error);
          }
        }

        // Small delay between batches to avoid rate limits
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      createdPlayers = allCreatedPlayers.length;
      console.log(`Completed player creation: ${createdPlayers}/${playersNeeded} players created successfully`);
    }

    // Create additional entries if needed
    if (entriesNeeded > 0) {
      // Get all active competitions and demo players
      const { data: competitions } = await supabaseAdmin
        .from('competitions')
        .select('*')
        .eq('status', 'ACTIVE')
        .eq('archived', false);

      const { data: players } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'PLAYER')
        .eq('is_demo_data', true);

      if (competitions && players && competitions.length > 0 && players.length > 0) {
        const entriesToCreate = [];
        
        for (let i = 0; i < entriesNeeded; i++) {
          const competition = getRandomElement(competitions);
          const player = getRandomElement(players);
          
          // Create entry within the last 3 months
          const entryDate = new Date();
          entryDate.setDate(entryDate.getDate() - getRandomInt(0, 90));

          entriesToCreate.push({
            competition_id: competition.id,
            player_id: player.id,
            email: player.email,
            entry_date: entryDate.toISOString(),
            paid: true,
            payment_date: entryDate.toISOString(),
            price_paid: competition.entry_fee || 25,
            status: getRandomElement(['completed', 'pending', 'verification_pending']),
            outcome_self: getRandomElement(['miss', 'miss', 'miss', 'win']), // 25% win rate
            is_demo_data: true
          });
        }

        const { data: newEntries, error: entryError } = await supabaseAdmin
          .from('entries')
          .insert(entriesToCreate)
          .select();

        if (entryError) throw entryError;
        createdEntries = newEntries?.length || 0;
      }
    }

    // Record this top-up session
    await supabaseAdmin
      .from('demo_data_sessions')
      .insert({
        session_type: 'top_up',
        entities_created: {
          clubs: createdClubs,
          players: createdPlayers,
          entries: createdEntries
        },
        notes: `Top-up demo data: +${createdClubs} clubs, +${createdPlayers} players, +${createdEntries} entries`
      });

    const response = {
      success: true,
      created: {
        clubs: createdClubs,
        players: createdPlayers,
        entries: createdEntries
      },
      message: `Successfully topped up demo data: +${createdClubs} clubs, +${createdPlayers} players, +${createdEntries} entries`
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in top-up-demo-data function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to top up demo data';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

serve(handler);