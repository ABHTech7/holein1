export type VerificationStatus =
  | 'initiated'
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected';

export interface ClaimRow {
  id: string;                // verifications.id
  status: VerificationStatus;
  created_at: string;
  evidence_captured_at?: string | null;
  entry_id: string;
  player_id: string;
  player_first_name?: string | null;
  player_last_name?: string | null;
  player_email: string;
  competition_id: string;
  competition_name: string;
  hole_number: number | null;
  club_id: string;
  club_name: string;
  selfie_url?: string | null;
  id_document_url?: string | null;
  photos_count?: number;     // optional if we add extra evidence later
}

export interface StatusCounts {
  total: number;
  pending: number;  // initiated + pending + under_review
  verified: number;
  rejected: number;
}