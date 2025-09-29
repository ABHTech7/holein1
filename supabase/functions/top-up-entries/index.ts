import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopUpEntriesRequest {
  entryCount: number; // 100, 250, or 500
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEntryDateInLast3Months(): Date {
  const now = new Date();
  
  // Weight distribution: 40% current month, 35% last month, 25% two months ago
  const weights = [0.4, 0.35, 0.25];
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
  let randomDay = getRandomInt(1, daysInMonth);
  
  // For current month, don't exceed today's date
  if (monthsBack === 0) {
    randomDay = Math.min(randomDay, now.getDate());
  }
  
  const entryDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), randomDay, 
    getRandomInt(9, 17), getRandomInt(0, 59)); // Random time during business hours
  
  // Final safety check - ensure not in future
  if (entryDate > now) {
    return new Date(now.getTime() - getRandomInt(1, 7) * 24 * 60 * 60 * 1000); // 1-7 days ago
  }
  
  return entryDate;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TopUpEntriesRequest = await req.json();
    const { entryCount } = body;

    if (![100, 250, 500].includes(entryCount)) {
      throw new Error('Entry count must be 100, 250, or 500');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Starting to create ${entryCount} demo entries...`);

    // Get all demo players (check both flag and email patterns)
    const { data: demoPlayers, error: playerError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .or('is_demo_data.eq.true,email.like.%@demo-golfer.test%,email.like.%@holein1demo.test%,email.like.%@holein1.test%')
      .eq('role', 'PLAYER')
      .neq('status', 'deleted');

    if (playerError) {
      console.error('Player query error:', playerError);
      throw new Error(`Failed to query demo players: ${playerError.message}`);
    }

    if (!demoPlayers || demoPlayers.length === 0) {
      console.log('No demo players found. First run backfill_demo_data_flags() or top-up-players');
      throw new Error('No demo players found. Run top-up-players first.');
    }

    // Get demo club IDs first
    const { data: demoClubs, error: clubError } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .or('is_demo_data.eq.true,email.like.%@demo-golf-club.test%,email.like.%@holein1demo.test%,name.like.%Demo%')
      .eq('active', true)
      .eq('archived', false);

    if (clubError) {
      console.error('Demo clubs query error:', clubError);
      throw new Error(`Failed to query demo clubs: ${clubError.message}`);
    }

    const demoClubIds = demoClubs?.map(club => club.id) || [];

    // Get all active demo competitions (check both flag and club ownership)
    let competitionsQuery = supabaseAdmin
      .from('competitions')
      .select('id, entry_fee, name, club_id')
      .eq('status', 'ACTIVE')
      .eq('archived', false);

    if (demoClubIds.length > 0) {
      competitionsQuery = competitionsQuery.or(`is_demo_data.eq.true,club_id.in.(${demoClubIds.join(',')})`);
    } else {
      competitionsQuery = competitionsQuery.eq('is_demo_data', true);
    }

    const { data: demoCompetitions, error: compError } = await competitionsQuery;

    if (compError) {
      console.error('Competition query error:', compError);
      throw new Error(`Failed to query demo competitions: ${compError.message}`);
    }

    if (!demoCompetitions || demoCompetitions.length === 0) {
      console.log('No active demo competitions found. First run backfill_demo_data_flags() or top-up-clubs');
      throw new Error('No active demo competitions found. Run top-up-clubs first.');
    }

    console.log(`Found ${demoPlayers.length} demo players and ${demoCompetitions.length} demo competitions`);

    // Get existing entries to avoid duplicates
    const { data: existingEntries } = await supabaseAdmin
      .from('entries')
      .select('player_id, competition_id')
      .eq('is_demo_data', true);

    const existingCombos = new Set(
      existingEntries?.map(e => `${e.player_id}-${e.competition_id}`) || []
    );

    // Generate entries
    const entriesToCreate: any[] = [];
    const maxAttempts = entryCount * 3; // Prevent infinite loops
    let attempts = 0;

    while (entriesToCreate.length < entryCount && attempts < maxAttempts) {
      attempts++;
      
      const player = getRandomElement(demoPlayers);
      const competition = getRandomElement(demoCompetitions);
      const comboKey = `${player.id}-${competition.id}`;
      
      // Skip if this player already has an entry for this competition
      if (existingCombos.has(comboKey)) {
        continue;
      }
      
      const entryDate = generateEntryDateInLast3Months();
      const outcome = Math.random() < 0.25 ? 'win' : 'miss'; // 25% win rate
      
      const entry = {
        player_id: player.id,
        competition_id: competition.id,
        email: player.email,
        entry_date: entryDate.toISOString(),
        paid: true,
        payment_date: entryDate.toISOString(),
        price_paid: competition.entry_fee, // Keep in pence to match database expectation
        outcome_self: outcome,
        status: outcome === 'win' ? 'verification_pending' : 'completed',
        completed_at: entryDate.toISOString(),
        terms_accepted_at: entryDate.toISOString(),
        is_demo_data: true,
        payment_provider: null,
        payment_id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        attempt_number: 1,
        is_repeat_attempt: false
      };
      
      entriesToCreate.push(entry);
      existingCombos.add(comboKey);
    }

    if (entriesToCreate.length === 0) {
      throw new Error('No new entries could be created (all player-competition combinations already exist)');
    }

    // Insert entries in batches
    const batchSize = 50;
    const totalBatches = Math.ceil(entriesToCreate.length / batchSize);
    let totalInserted = 0;
    const monthlyBreakdown = { current: 0, lastMonth: 0, twoMonthsAgo: 0 };

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, entriesToCreate.length);
      const batchEntries = entriesToCreate.slice(batchStart, batchEnd);

      const { data: insertedEntries, error: entryError } = await supabaseAdmin
        .from('entries')
        .insert(batchEntries)
        .select();

      if (entryError) {
        console.error(`Batch ${batch + 1} error:`, entryError);
        continue;
      }

      totalInserted += insertedEntries.length;
      
      // Count entries by month for breakdown
      const now = new Date();
      insertedEntries.forEach(entry => {
        const entryDate = new Date(entry.entry_date);
        const monthsBack = now.getMonth() - entryDate.getMonth() + (now.getFullYear() - entryDate.getFullYear()) * 12;
        
        if (monthsBack === 0) monthlyBreakdown.current++;
        else if (monthsBack === 1) monthlyBreakdown.lastMonth++;
        else if (monthsBack === 2) monthlyBreakdown.twoMonthsAgo++;
      });

      console.log(`Batch ${batch + 1}/${totalBatches}: Inserted ${insertedEntries.length} entries`);
    }

    // Add error handling for no entries inserted
    if (totalInserted === 0) {
      throw new Error('Failed to create any entries - database constraint violations occurred');
    }

    const result = {
      success: true,
      entriesCreated: totalInserted,
      requestedCount: entryCount,
      monthlyBreakdown,
      playersUsed: demoPlayers.length,
      competitionsUsed: demoCompetitions.length
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Top-up entries error:', error);
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