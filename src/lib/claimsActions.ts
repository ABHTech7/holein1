import { supabase } from '@/integrations/supabase/client';

export async function approveClaim(id: string) {
  return supabase
    .from('verifications')
    .update({ 
      status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: (await supabase.auth.getUser()).data.user?.id
    })
    .eq('id', id);
}

export async function rejectClaim(id: string) {
  return supabase
    .from('verifications')
    .update({ 
      status: 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: (await supabase.auth.getUser()).data.user?.id
    })
    .eq('id', id);
}

export async function moveToUnderReview(id: string) {
  return supabase
    .from('verifications')
    .update({ status: 'under_review' })
    .eq('id', id);
}