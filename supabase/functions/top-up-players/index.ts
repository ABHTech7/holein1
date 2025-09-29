import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopUpPlayersRequest {
  playerCount: number; // 100, 250, or 500
}

const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
  'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
  'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 20);
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TopUpPlayersRequest = await req.json();
    const { playerCount } = body;

    if (![100, 250, 500].includes(playerCount)) {
      throw new Error('Player count must be 100, 250, or 500');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Starting to create ${playerCount} demo players...`);

    // Get all demo clubs to distribute players across
    const { data: demoClubs, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('is_demo_data', true);

    if (clubError || !demoClubs || demoClubs.length === 0) {
      throw new Error('No demo clubs found to distribute players across');
    }

    console.log(`Found ${demoClubs.length} demo clubs to distribute players across`);

    // Process in batches of 25 to avoid timeouts
    const batchSize = 25;
    const totalBatches = Math.ceil(playerCount / batchSize);
    const allCreatedPlayers: any[] = [];

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, playerCount);
      const batchSize_ = batchEnd - batchStart;

      console.log(`Processing batch ${batch + 1}/${totalBatches} (${batchSize_} players)`);

      const playersToCreate = Array.from({ length: batchSize_ }, (_, index) => {
        const { firstName, lastName } = generatePlayerName();
        const timestamp = Date.now();
        const uniqueId = Math.floor(Math.random() * 10000);
        const email = `${sanitizeForEmail(firstName)}.${sanitizeForEmail(lastName)}.${timestamp}.${uniqueId}@demo-golfer.test`;
        const phone = generateUKPhone();
        
        return {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          phone_e164: `+44${phone.replace(/[^0-9]/g, '').slice(1)}`,
          age_years: getRandomInt(18, 70),
          handicap: Math.random() < 0.8 ? getRandomInt(0, 36) : null,
          gender: getRandomElement(['male', 'female']),
          role: 'PLAYER',
          is_demo_data: true,
          club_id: getRandomElement(demoClubs).id // Distribute across demo clubs
        };
      });

      // Create auth users first
      const authPromises = playersToCreate.map(async (player) => {
        try {
          const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
            email: player.email,
            password: 'DemoPlayer123!',
            email_confirm: true,
            user_metadata: {
              first_name: player.first_name,
              last_name: player.last_name,
              role: 'PLAYER'
            }
          });

          if (error) {
            console.error(`Failed to create auth user for ${player.email}:`, error);
            return null;
          }

          return { ...player, id: authUser.user?.id };
        } catch (error) {
          console.error(`Auth creation error for ${player.email}:`, error);
          return null;
        }
      });

      const authResults = await Promise.all(authPromises);
      const validPlayers = authResults.filter(player => player !== null);

      if (validPlayers.length > 0) {
        // Insert profiles
        const { data: profiles, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert(validPlayers)
          .select();

        if (profileError) {
          console.error('Profile creation error:', profileError);
        } else {
          allCreatedPlayers.push(...profiles);
          console.log(`Batch ${batch + 1}: Created ${profiles.length} players`);
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const result = {
      success: true,
      playersCreated: allCreatedPlayers.length,
      requestedCount: playerCount,
      distributedAcrossClubs: demoClubs.length
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Top-up players error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

serve(handler);