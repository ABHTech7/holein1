import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🧹 Starting file cleanup process...');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get expired files from uploaded_files table
    const { data: expiredFiles, error: queryError } = await supabase
      .from('uploaded_files')
      .select('*')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (queryError) {
      console.error('❌ Error querying expired files:', queryError);
      throw queryError;
    }

    console.log(`📋 Found ${expiredFiles?.length || 0} expired files to cleanup`);

    let deletedCount = 0;
    let errorCount = 0;

    // Process each expired file
    if (expiredFiles && expiredFiles.length > 0) {
      for (const file of expiredFiles) {
        try {
          // Delete file from storage
          const storagePath = `${file.user_id}/${file.storage_path}`;
          console.log(`🗑️ Deleting file: ${file.storage_bucket}/${storagePath}`);
          
          const { error: storageError } = await supabase.storage
            .from(file.storage_bucket)
            .remove([storagePath]);

          if (storageError) {
            console.error(`❌ Storage deletion error for ${storagePath}:`, storageError);
            errorCount++;
            continue;
          }

          // Remove record from database
          const { error: dbError } = await supabase
            .from('uploaded_files')
            .delete()
            .eq('id', file.id);

          if (dbError) {
            console.error(`❌ Database deletion error for file ${file.id}:`, dbError);
            errorCount++;
            continue;
          }

          deletedCount++;
          console.log(`✅ Successfully deleted file: ${file.original_filename}`);
          
        } catch (error) {
          console.error(`❌ Error processing file ${file.id}:`, error);
          errorCount++;
        }
      }
    }

    // Also cleanup orphaned verifications with auto_miss_at in the past
    const { data: expiredVerifications, error: verificationQueryError } = await supabase
      .from('verifications')
      .select('id, entry_id, auto_miss_at')
      .not('auto_miss_at', 'is', null)
      .lt('auto_miss_at', new Date().toISOString())
      .eq('auto_miss_applied', false);

    if (verificationQueryError) {
      console.error('❌ Error querying expired verifications:', verificationQueryError);
    } else if (expiredVerifications && expiredVerifications.length > 0) {
      console.log(`⏰ Found ${expiredVerifications.length} expired verifications to auto-miss`);
      
      for (const verification of expiredVerifications) {
        try {
          // Update the entry to auto-miss
          const { error: entryError } = await supabase
            .from('entries')
            .update({ 
              outcome_self: 'auto_miss',
              outcome_reported_at: new Date().toISOString(),
              status: 'expired'
            })
            .eq('id', verification.entry_id);

          if (entryError) {
            console.error(`❌ Error auto-missing entry ${verification.entry_id}:`, entryError);
            continue;
          }

          // Update verification to mark auto-miss as applied
          const { error: verificationError } = await supabase
            .from('verifications')
            .update({ auto_miss_applied: true })
            .eq('id', verification.id);

          if (verificationError) {
            console.error(`❌ Error updating verification ${verification.id}:`, verificationError);
            continue;
          }

          console.log(`⏰ Successfully auto-missed entry ${verification.entry_id}`);
          
        } catch (error) {
          console.error(`❌ Error processing verification ${verification.id}:`, error);
        }
      }
    }

    const summary = {
      expired_files_found: expiredFiles?.length || 0,
      files_deleted_successfully: deletedCount,
      files_deletion_errors: errorCount,
      expired_verifications_found: expiredVerifications?.length || 0,
      cleanup_completed_at: new Date().toISOString()
    };

    console.log('🎉 Cleanup completed:', summary);

    return new Response(JSON.stringify({
      success: true,
      message: 'File cleanup completed successfully',
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('💥 Critical error in cleanup function:', error);
    return new Response(JSON.stringify({ 
      error: 'File cleanup failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});