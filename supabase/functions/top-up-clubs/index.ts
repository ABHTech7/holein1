import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions
const clubPrefixes = [
  'Royal', 'Old', 'New', 'St', 'Mount', 'Glen', 'Loch', 'Forest', 
  'Valley', 'Hill', 'Park', 'Green', 'Oak', 'Pine', 'Cedar', 'Willow'
];

const clubSuffixes = [
  'Golf Club', 'Golf Course', 'Country Club', 'Links', 'Resort', 
  'Golf Resort', 'Golf & Country Club', 'Golf Links'
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

function sanitizeForEmail(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 20);
}

function generatePastDate(minDaysAgo: number, maxDaysAgo: number): Date {
  const now = new Date();
  const daysAgo = getRandomInt(minDaysAgo, maxDaysAgo);
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - daysAgo);
  return pastDate;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting to create 25 demo clubs...');

    // Create 25 new clubs
    const clubsToCreate = Array.from({ length: 25 }, () => {
      const clubName = generateClubName();
      const sanitizedName = sanitizeForEmail(clubName);
      
      return {
        name: clubName,
        email: `${sanitizedName}@demo-golf-club.test`,
        phone: `0${getRandomInt(1111, 9999)} ${getRandomInt(100000, 999999)}`,
        address: `Golf Course Lane, ${getRandomElement(['Surrey', 'Kent', 'Essex', 'Hertfordshire', 'Buckinghamshire'])}, UK`,
        website: `https://${sanitizedName}.golf.co.uk`,
        is_demo_data: true,
        active: true
      };
    });

    const { data: newClubs, error: clubError } = await supabaseAdmin
      .from('clubs')
      .insert(clubsToCreate)
      .select();

    if (clubError) {
      throw new Error(`Failed to create clubs: ${clubError.message}`);
    }

    console.log(`Created ${newClubs.length} clubs`);

    // Create competitions: half get 1 competition, half get 2 competitions
    const competitionsToCreate: any[] = [];
    
    newClubs.forEach((club, index) => {
      const numCompetitions = index < 12 ? 1 : 2; // First 12 get 1, rest get 2
      
      for (let i = 0; i < numCompetitions; i++) {
        const startDate = generatePastDate(30, 365); // 1 month to 1 year ago
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from start
        
        competitionsToCreate.push({
          club_id: club.id,
          name: `${club.name} ${i === 0 ? 'Championship' : 'Monthly'} Challenge`,
          description: `Professional hole-in-one competition with insurance coverage`,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'ACTIVE',
          entry_fee: getRandomElement([1000, 2500, 5000]), // £10, £25, £50 only
          prize_pool: getRandomElement([1000000, 2500000, 5000000]),
          hole_number: getRandomInt(1, 18),
          is_year_round: true,
          is_demo_data: true,
          slug: `${club.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i === 0 ? 'championship' : 'monthly'}-challenge`
        });
      }
    });

    const { error: compError } = await supabaseAdmin
      .from('competitions')
      .insert(competitionsToCreate);

    if (compError) {
      throw new Error(`Failed to create competitions: ${compError.message}`);
    }

    console.log(`Created ${competitionsToCreate.length} competitions`);

    const result = {
      success: true,
      clubsCreated: newClubs.length,
      competitionsCreated: competitionsToCreate.length,
      breakdown: {
        clubsWith1Competition: 12,
        clubsWith2Competitions: 13
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Top-up clubs error:', error);
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