import { supabase } from "@/integrations/supabase/client";

/**
 * Generate the new entry URL format for a competition
 * Format: /enter/{club_slug}/{hole_number}
 */
export const generateEntryUrl = async (competitionId: string, clubId?: string, holeNumber?: number): Promise<string | null> => {
  try {
    // If we don't have club info, fetch it
    if (!clubId || !holeNumber) {
      const { data: competition, error } = await supabase
        .from('competitions')
        .select('club_id, hole_number')
        .eq('id', competitionId)
        .single();
      
      if (error || !competition) {
        console.error('Error fetching competition for URL generation:', error);
        return `/enter/${competitionId}`; // Fallback to old format
      }
      
      clubId = competition.club_id;
      holeNumber = competition.hole_number;
    }

    // Get the club name to generate slug
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('name')
      .eq('id', clubId)
      .single();
    
    if (clubError || !club) {
      console.error('Error fetching club for URL generation:', clubError);
      return `/enter/${competitionId}`; // Fallback to old format
    }

    const clubSlug = createClubSlug(club.name);
    return `/enter/${clubSlug}/${holeNumber}`;
  } catch (error) {
    console.error('Error generating entry URL:', error);
    return `/enter/${competitionId}`; // Fallback to old format
  }
};

/**
 * Generate entry URL synchronously if we have all the data
 */
export const generateEntryUrlSync = (clubSlug: string, holeNumber: number): string => {
  return `/enter/${clubSlug}/${holeNumber}`;
};

/**
 * Create club slug from club name
 */
export const createClubSlug = (clubName: string): string => {
  return clubName
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Create competition slug from competition name
 */
export const createCompetitionSlug = (competitionName: string): string => {
  return competitionName
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generate entry URL using competition name (new format)
 */
export const generateCompetitionEntryUrl = async (competitionId: string): Promise<string | null> => {
  try {
    const { data: competition, error } = await supabase
      .from('competitions')
      .select('name, club_id')
      .eq('id', competitionId)
      .single();
    
    if (error || !competition) {
      console.error('Error fetching competition for URL generation:', error);
      return `/enter/${competitionId}`; // Fallback to old format
    }

    // Get the club name to generate slug
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('name')
      .eq('id', competition.club_id)
      .single();
    
    if (clubError || !club) {
      console.error('Error fetching club for URL generation:', clubError);
      return `/enter/${competitionId}`; // Fallback to old format
    }

    const clubSlug = createClubSlug(club.name);
    const competitionSlug = createCompetitionSlug(competition.name);
    return `/enter/${clubSlug}/${competitionSlug}`;
  } catch (error) {
    console.error('Error generating competition entry URL:', error);
    return `/enter/${competitionId}`; // Fallback to old format
  }
};

/**
 * Generate entry URL synchronously if we have all the data (new format)
 */
export const generateCompetitionEntryUrlSync = (clubSlug: string, competitionSlug: string): string => {
  return `/enter/${clubSlug}/${competitionSlug}`;
};