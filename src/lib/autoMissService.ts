import { supabase } from "@/integrations/supabase/client";
import { getConfig } from "@/lib/featureFlags";

export interface AutoMissJob {
  id: string;
  entryId: string;
  verificationId: string;
  scheduledAt: string;
  executedAt?: string;
  status: 'pending' | 'executed' | 'cancelled';
}

/**
 * Schedules an auto-miss job for a verification record
 * This will automatically mark the entry as 'miss' if not verified within the timeout
 */
export const scheduleAutoMiss = async (
  entryId: string,
  verificationId: string,
  timeoutHours?: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Use config timeout or provided timeout
    const config = getConfig();
    const actualTimeout = timeoutHours || config.verificationTimeoutHours;
    const scheduledAt = new Date(Date.now() + actualTimeout * 60 * 60 * 1000);
    
    // Update verification record with auto-miss timestamp
    const { error: updateError } = await supabase
      .from('verifications')
      .update({
        auto_miss_at: scheduledAt.toISOString(),
        auto_miss_applied: false,
      })
      .eq('id', verificationId);

    if (updateError) {
      console.error('Failed to schedule auto-miss:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Auto-miss scheduled for verification ${verificationId} at ${scheduledAt.toISOString()}`);
    
    // In a production environment, you might also want to:
    // 1. Create a job record in a jobs table
    // 2. Register with a job queue system
    // 3. Set up database triggers
    // For now, we rely on the cleanup edge function to handle this

    return { success: true };

  } catch (error) {
    console.error('Error scheduling auto-miss:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Cancels an auto-miss job (called when verification is completed)
 */
export const cancelAutoMiss = async (
  verificationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Clear auto-miss timestamp and mark as applied (cancelled)
    const { error: updateError } = await supabase
      .from('verifications')
      .update({
        auto_miss_at: null,
        auto_miss_applied: true, // Prevents future auto-miss
      })
      .eq('id', verificationId);

    if (updateError) {
      console.error('Failed to cancel auto-miss:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Auto-miss cancelled for verification ${verificationId}`);
    return { success: true };

  } catch (error) {
    console.error('Error cancelling auto-miss:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Manually triggers auto-miss processing (for testing or manual execution)
 */
export const processExpiredVerifications = async (): Promise<{
  processed: number;
  errors: number;
  details: Array<{ verificationId: string; success: boolean; error?: string }>;
}> => {
  try {
    // Get expired verifications
    const { data: expiredVerifications, error: queryError } = await supabase
      .from('verifications')
      .select('id, entry_id, auto_miss_at')
      .not('auto_miss_at', 'is', null)
      .lt('auto_miss_at', new Date().toISOString())
      .eq('auto_miss_applied', false);

    if (queryError) {
      console.error('Failed to query expired verifications:', queryError);
      throw queryError;
    }

    if (!expiredVerifications || expiredVerifications.length === 0) {
      console.log('No expired verifications found');
      return { processed: 0, errors: 0, details: [] };
    }

    console.log(`Processing ${expiredVerifications.length} expired verifications`);

    const results = [];
    let processed = 0;
    let errors = 0;

    for (const verification of expiredVerifications) {
      try {
        // Update entry to auto-miss
        const { error: entryError } = await supabase
          .from('entries')
          .update({
            outcome_self: 'auto_miss',
            outcome_reported_at: new Date().toISOString(),
            status: 'expired'
          })
          .eq('id', verification.entry_id);

        if (entryError) {
          throw entryError;
        }

        // Mark verification as processed
        const { error: verificationError } = await supabase
          .from('verifications')
          .update({ auto_miss_applied: true })
          .eq('id', verification.id);

        if (verificationError) {
          throw verificationError;
        }

        results.push({ verificationId: verification.id, success: true });
        processed++;
        
      } catch (error) {
        console.error(`Failed to process verification ${verification.id}:`, error);
        results.push({
          verificationId: verification.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errors++;
      }
    }

    console.log(`Auto-miss processing completed: ${processed} processed, ${errors} errors`);
    
    return { processed, errors, details: results };

  } catch (error) {
    console.error('Error in processExpiredVerifications:', error);
    throw error;
  }
};

/**
 * Gets the status of auto-miss jobs for monitoring
 */
export const getAutoMissStatus = async (): Promise<{
  pending: number;
  total: number;
  nextExpiry?: string;
}> => {
  try {
    // Count pending auto-miss jobs
    const { count: pending } = await supabase
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .not('auto_miss_at', 'is', null)
      .eq('auto_miss_applied', false);

    // Count total verifications with auto-miss
    const { count: total } = await supabase
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .not('auto_miss_at', 'is', null);

    // Get next expiry
    const { data: nextExpiry } = await supabase
      .from('verifications')
      .select('auto_miss_at')
      .not('auto_miss_at', 'is', null)
      .eq('auto_miss_applied', false)
      .order('auto_miss_at', { ascending: true })
      .limit(1)
      .single();

    return {
      pending: pending || 0,
      total: total || 0,
      nextExpiry: nextExpiry?.auto_miss_at || undefined,
    };

  } catch (error) {
    console.error('Error getting auto-miss status:', error);
    return { pending: 0, total: 0 };
  }
};