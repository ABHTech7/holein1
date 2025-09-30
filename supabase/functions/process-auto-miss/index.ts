import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Auto-Miss Background Job
 * 
 * This edge function should be scheduled to run periodically (e.g., every 15 minutes)
 * to automatically mark entries as missed when the 12-hour auto-miss window expires.
 * 
 * Schedule this using pg_cron (every 15 minutes):
 * 
 * SELECT cron.schedule(
 *   'process-auto-miss',
 *   '* /15 * * * *',
 *   $$
 *   SELECT net.http_post(
 *     url:='https://srnbylbbsdckkwatfqjg.supabase.co/functions/v1/process-auto-miss',
 *     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
 *   ) as request_id;
 *   $$
 * );
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = crypto.randomUUID().slice(0, 8);
  console.log(`[${traceId}] 🤖 Auto-miss job started`);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    // Find entries that need auto-miss:
    // - auto_miss_at has passed
    // - auto_miss_applied is false
    // - outcome_self is NULL (no outcome reported yet)
    const { data: expiredEntries, error: fetchError } = await supabaseAdmin
      .from('entries')
      .select('id, competition_id, player_id, auto_miss_at')
      .lte('auto_miss_at', now)
      .eq('auto_miss_applied', false)
      .is('outcome_self', null)
      .limit(100); // Process in batches

    if (fetchError) {
      console.error(`[${traceId}] ❌ Error fetching expired entries:`, fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: fetchError.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!expiredEntries || expiredEntries.length === 0) {
      console.log(`[${traceId}] ✅ No entries need auto-miss`);
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0,
        message: "No entries to process"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[${traceId}] 📋 Found ${expiredEntries.length} entries to auto-miss`);

    // Update all expired entries
    const entryIds = expiredEntries.map(e => e.id);
    const { error: updateError } = await supabaseAdmin
      .from('entries')
      .update({
        outcome_self: 'auto_miss',
        outcome_reported_at: now,
        status: 'completed',
        auto_miss_applied: true,
        attempt_window_end: now // End window immediately
      })
      .in('id', entryIds);

    if (updateError) {
      console.error(`[${traceId}] ❌ Error updating entries:`, updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: updateError.message,
        processed: 0
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[${traceId}] ✅ Successfully auto-missed ${entryIds.length} entries`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: entryIds.length,
      entry_ids: entryIds
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error(`[${traceId}] 💥 Unexpected error:`, error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
