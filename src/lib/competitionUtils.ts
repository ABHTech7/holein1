import { supabase } from "@/integrations/supabase/client";

/**
 * Generate the new entry URL format for a competition
 * Format: /enter/{venue_slug}/{hole_number}
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

    // Get the venue slug for this club
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('slug')
      .eq('club_id', clubId)
      .single();
    
    if (venueError || !venue) {
      console.error('Error fetching venue for URL generation:', venueError);
      return `/enter/${competitionId}`; // Fallback to old format
    }

    return `/enter/${venue.slug}/${holeNumber}`;
  } catch (error) {
    console.error('Error generating entry URL:', error);
    return `/enter/${competitionId}`; // Fallback to old format
  }
};

/**
 * Generate entry URL synchronously if we have all the data
 */
export const generateEntryUrlSync = (venueSlug: string, holeNumber: number): string => {
  return `/enter/${venueSlug}/${holeNumber}`;
};

/**
 * Create venue slug from club name
 */
export const createVenueSlug = (clubName: string): string => {
  return clubName
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};