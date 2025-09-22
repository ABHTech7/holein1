import { supabase } from '@/integrations/supabase/client';

export async function ensureVerificationRecord(entryId: string) {
  // Upsert verification record (create or update if exists)
  const { data, error } = await supabase
    .from('verifications')
    .upsert({
      entry_id: entryId,
      status: 'initiated',
      witnesses: '[]',
      evidence_captured_at: new Date().toISOString(),
      social_consent: false
    }, {
      onConflict: 'entry_id'
    })
    .select()
    .single();

  return { data, error };
}

export async function updateVerificationEvidence(
  entryId: string, 
  evidence: {
    selfie_url?: string;
    id_document_url?: string;
    handicap_proof_url?: string;
    video_url?: string;
    witnesses?: any;
    social_consent?: boolean;
    status?: string;
  }
) {
  const { data, error } = await supabase
    .from('verifications')
    .update({
      ...evidence,
      updated_at: new Date().toISOString()
    })
    .eq('entry_id', entryId)
    .select()
    .single();

  return { data, error };
}

export async function ensureAllWinVerifications() {
  try {
    // Get all existing verification entry IDs to avoid duplicates
    const { data: existingVerifications } = await supabase
      .from('verifications')
      .select('entry_id');

    const existingEntryIds = new Set(existingVerifications?.map(v => v.entry_id) || []);

    // Get all wins without verification records
    const { data: winsWithoutVerification } = await supabase
      .from('entries')
      .select('id, outcome_reported_at')
      .eq('outcome_self', 'win');

    if (!winsWithoutVerification?.length) {
      return [];
    }

    // Filter out entries that already have verification records
    const missingWins = winsWithoutVerification.filter(entry => !existingEntryIds.has(entry.id));

    if (!missingWins.length) {
      return [];
    }

    // Create verification records for all missing wins
    const verifications = missingWins.map(entry => ({
      entry_id: entry.id,
      status: 'pending',
      witnesses: '[]',
      evidence_captured_at: entry.outcome_reported_at || new Date().toISOString(),
      social_consent: false
    }));

    const { data, error } = await supabase
      .from('verifications')
      .insert(verifications)
      .select();

    if (error) {
      console.error('Error creating verification records:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in ensureAllWinVerifications:', error);
    throw error;
  }
}

export async function ensureWinVerificationForEntry(entryId: string) {
  try {
    // Check if verification already exists
    const { data: existing } = await supabase
      .from('verifications')
      .select('id')
      .eq('entry_id', entryId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Create new verification record
    const { data, error } = await supabase
      .from('verifications')
      .insert({
        entry_id: entryId,
        status: 'pending',
        witnesses: '[]',
        evidence_captured_at: new Date().toISOString(),
        social_consent: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating verification record:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in ensureWinVerificationForEntry:', error);
    throw error;
  }
}