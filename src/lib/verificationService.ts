import { supabase } from '@/integrations/supabase/client';

export async function ensureVerificationRecord(entryId: string) {
  // Upsert verification record (create or update if exists)
  const { data, error } = await supabase
    .from('verifications')
    .upsert({
      entry_id: entryId,
      status: 'initiated',
      witnesses: [],
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