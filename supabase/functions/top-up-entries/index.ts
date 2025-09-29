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
  
  const entryDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), randomDay);
  
  // Ensure not in future
  if (entryDate > now) {
    return now;
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

    // Get all demo players
    const { data: demoPlayers, error: playerError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('is_demo_data', true)
      .eq('role', 'PLAYER');

    if (playerError || !demoPlayers || demoPlayers.length === 0) {
      throw new Error('No demo players found');
    }

    // Get all active demo competitions
    const { data: demoCompetitions, error: compError } = await supabaseAdmin
      .from('competitions')
      .select('id, entry_fee, name')
      .eq('is_demo_data', true)
      .eq('status', 'ACTIVE');

    if (compError || !demoCompetitions || demoCompetitions.length === 0) {
      throw new Error('No active demo competitions found');
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
        price_paid: competition.entry_fee / 100, // Convert pence to pounds
        outcome_self: outcome,
        status: outcome === 'win' ? 'verification_pending' : 'completed',
        completed_at: entryDate.toISOString(),
        terms_accepted_at: entryDate.toISOString(),
        is_demo_data: true,
        payment_provider: 'demo',
        payment_id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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