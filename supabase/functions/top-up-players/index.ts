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

function generatePlayerRegistrationDateInLast3Months(): Date {
  const now = new Date();
  
  // Weight distribution: 50% current month, 30% last month, 20% two months ago
  const weights = [0.5, 0.3, 0.2];
  const rand = Math.random();
  let monthsBack = 0;
  
  if (rand < weights[0]) {
    monthsBack = 0; // Current month
  } else if (rand < weights[0] + weights[1]) {
    monthsBack = 1; // Last month
  } else {
    monthsBack = 2; // Two months ago
  }
  
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  const randomDay = getRandomInt(1, daysInMonth);
  
  const registrationDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), randomDay);
  
  // Ensure not in future
  if (registrationDate > now) {
    return now;
  }
  
  return registrationDate;
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

    // Get all demo clubs to distribute players across (check both flag and email patterns)
    const { data: demoClubs, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('id, name')
      .or('is_demo_data.eq.true,email.like.%@demo-golf-club.test%,email.like.%@holein1demo.test%,name.like.%Demo%');

    if (clubError) {
      console.error('Club query error:', clubError);
      throw new Error(`Failed to query demo clubs: ${clubError.message}`);
    }

    if (!demoClubs || demoClubs.length === 0) {
      console.log('No demo clubs found. First run backfill_demo_data_flags() or top-up-clubs');
      throw new Error('No demo clubs found to distribute players across. Run top-up-clubs first.');
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
        const batchIndex = batch * batchSize + index;
        const uniqueId = `${timestamp}-${batchIndex}-${Math.floor(Math.random() * 1000)}`;
        const email = `${sanitizeForEmail(firstName)}.${sanitizeForEmail(lastName)}.${uniqueId}@demo-golfer.test`;
        const phone = generateUKPhone();
        const registrationDate = generatePlayerRegistrationDateInLast3Months();
        
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
          club_id: getRandomElement(demoClubs).id, // Distribute across demo clubs
          created_at: registrationDate.toISOString(),
          updated_at: registrationDate.toISOString()
        };
      });

      // Create auth users first
      const authPromises = playersToCreate.map(async (player) => {
        try {
          const playerDate = new Date(player.created_at);
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

          // Update auth user created_at to match player registration date
          if (authUser.user) {
            try {
              await supabaseAdmin.auth.admin.updateUserById(authUser.user.id, {
                user_metadata: {
                  ...authUser.user.user_metadata,
                  created_at: playerDate.toISOString()
                }
              });
            } catch (updateError) {
              console.warn(`Failed to update auth user created_at for ${player.email}:`, updateError);
            }
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