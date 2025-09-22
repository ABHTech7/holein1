import { supabase } from '@/integrations/supabase/client';

export async function ensureVerificationRecord(entryId: string) {
  // Check if verification record already exists
  const { data: existing } = await supabase
    .from('verifications')
    .select('id')
    .eq('entry_id', entryId)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Create verification record if it doesn't exist
  const { data, error } = await supabase
    .from('verifications')
    .insert({
      entry_id: entryId,
      status: 'initiated',
      witnesses: [],
      evidence_captured_at: new Date().toISOString()
    })
    .select()
    .single();

  return { data, error };
}

export async function ensureAllWinVerifications() {
  // Get all wins without verification records
  const { data: winsWithoutVerification } = await supabase
    .from('entries')
    .select('id, outcome_reported_at')
    .eq('outcome_self', 'win')
    .not('id', 'in', `(${
      (await supabase.from('verifications').select('entry_id')).data?.map(v => `'${v.entry_id}'`).join(',') || "''"
    })`);

  if (!winsWithoutVerification?.length) {
    return [];
  }

  // Create verification records for all missing wins
  const verifications = winsWithoutVerification.map(entry => ({
    entry_id: entry.id,
    status: 'initiated',
    witnesses: [],
    evidence_captured_at: entry.outcome_reported_at || new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('verifications')
    .insert(verifications)
    .select();

  if (error) {
    console.error('Error creating verification records:', error);
  }

  return data || [];
}