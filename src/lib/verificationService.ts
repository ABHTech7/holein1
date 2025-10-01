import { supabase } from '@/integrations/supabase/client';

/**
 * Generate signed URLs for private verification files
 * @param storagePath - Full storage path (e.g., "verifications/entry-id/selfie-uuid.jpg")
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Public signed URL or null if error
 */
export async function getSignedVerificationUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Extract path after "verifications/" bucket name
    const path = storagePath.replace(/^verifications\//, '');
    
    const { data, error } = await supabase.storage
      .from('verifications')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    return null;
  }
}

/**
 * Batch generate signed URLs for multiple verification files
 * @param paths - Array of storage paths
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Object mapping original paths to signed URLs
 */
export async function getBatchSignedUrls(
  paths: string[],
  expiresIn: number = 3600
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};
  
  await Promise.all(
    paths.map(async (path) => {
      results[path] = await getSignedVerificationUrl(path, expiresIn);
    })
  );
  
  return results;
}

export async function ensureVerificationRecord(entryId: string) {
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

export async function createOrUpsertVerification(
  entryId: string,
  payload: {
    selfie_url?: string;
    id_document_url?: string;
    handicap_proof_url?: string;
    video_url?: string;
    witness_name?: string;
    witness_email?: string;
    witness_phone?: string;
    social_consent?: boolean;
    status?: string;
  }
) {
  const { data, error } = await supabase.rpc('create_or_upsert_verification', {
    p_entry_id: entryId,
    p_payload: payload as any
  });

  if (error) {
    console.error('Error creating/updating verification:', error);
    throw error;
  }

  return data;
}

export async function uploadVerificationEvidence(
  entryId: string,
  files: {
    selfie: File;
    idDocument: File;
    handicapProof?: File;
    video?: File;
  }
): Promise<{ [key: string]: string }> {
  const uploadedUrls: { [key: string]: string } = {};

  // Upload files to verifications bucket using structured path
  const uploadToVerificationsBucket = async (file: File, role: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${entryId}/${role}-${crypto.randomUUID()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('verifications')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return `verifications/${data.path}`;
  };

  // Upload required files
  uploadedUrls.selfie_url = await uploadToVerificationsBucket(files.selfie, 'selfie');
  uploadedUrls.id_document_url = await uploadToVerificationsBucket(files.idDocument, 'id-document');
  
  if (files.handicapProof) {
    uploadedUrls.handicap_proof_url = await uploadToVerificationsBucket(files.handicapProof, 'handicap-proof');
  }
  
  if (files.video) {
    uploadedUrls.video_url = await uploadToVerificationsBucket(files.video, 'video');
  }

  return uploadedUrls;
}

export async function ensureAllWinVerifications() {
  try {
    const { data: existingVerifications } = await supabase
      .from('verifications')
      .select('entry_id');

    const existingEntryIds = new Set(existingVerifications?.map(v => v.entry_id) || []);

    const { data: winsWithoutVerification } = await supabase
      .from('entries')
      .select('id, outcome_reported_at')
      .eq('outcome_self', 'win');

    if (!winsWithoutVerification?.length) {
      return [];
    }

    const missingWins = winsWithoutVerification.filter(entry => !existingEntryIds.has(entry.id));

    if (!missingWins.length) {
      return [];
    }

    const verifications = missingWins.map(entry => ({
      entry_id: entry.id,
      status: 'pending',
      witnesses: [],
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
    const { data: existing } = await supabase
      .from('verifications')
      .select('id')
      .eq('entry_id', entryId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('verifications')
      .insert({
        entry_id: entryId,
        status: 'pending',
        witnesses: [],
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
