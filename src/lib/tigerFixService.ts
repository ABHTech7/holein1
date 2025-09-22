import { supabase } from '@/integrations/supabase/client';

// Temporary service to fix Tiger's verification record
export async function fixTigerVerification() {
  const tigersEntryId = 'f327dcb5-f0dd-44fd-929d-082c9bff49fe';
  
  // Check if verification record already exists
  const { data: existing } = await supabase
    .from('verifications')
    .select('id')
    .eq('entry_id', tigersEntryId)
    .single();

  if (existing) {
    console.log('Tiger verification record already exists:', existing.id);
    return existing;
  }

  // Create verification record for Tiger
  const { data, error } = await supabase
    .from('verifications')
    .insert({
      entry_id: tigersEntryId,
      status: 'initiated',
      witnesses: [],
      evidence_captured_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating Tiger verification record:', error);
    return null;
  }

  console.log('Tiger verification record created:', data);
  return data;
}

// Call this function immediately
fixTigerVerification();