import { supabase } from "@/integrations/supabase/client";

/**
 * Safe club data interface for public consumption
 * Only includes non-sensitive information
 */
export interface SafeClubData {
  id: string;
  name: string;
  website: string;
  logo_url: string;
  address: string;
  email: string;
  phone: string;
}

/**
 * Service to handle club data access with proper security filtering
 */
/**
 * Safe competition data interface for public consumption
 */
export interface SafeCompetitionData {
  id: string;
  name: string;
  description: string;
  entry_fee: number;
  prize_pool: number;
  hole_number: number;
  start_date: string;
  end_date: string;
  is_year_round: boolean;
  hero_image_url: string;
  club_id: string;
  club_name: string;
  club_website: string;
  club_logo_url: string;
  club_address: string;
  club_email: string;
  club_phone: string;
}

export class ClubService {
  /**
   * Get clubs data safely - only returns non-sensitive information for public access
   * Uses secure database function that filters sensitive data
   */
  static async getSafeClubsData(): Promise<SafeClubData[]> {
    try {
      // Use the secure database function that only returns safe data
      const { data, error } = await supabase.rpc('get_safe_clubs_data');

      if (error) {
        console.error('Error fetching safe club data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getSafeClubsData:', error);
      return [];
    }
  }

  /**
   * Get competition data safely for public access
   * Uses secure database function that only returns non-sensitive competition information
   */
  static async getSafeCompetitionData(clubId: string, competitionSlug?: string): Promise<SafeCompetitionData[]> {
    try {
      const { data, error } = await supabase.rpc('get_safe_competition_data', {
        p_club_id: clubId,
        p_competition_slug: competitionSlug || ''
      });

      if (error) {
        console.error('Error fetching safe competition data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getSafeCompetitionData:', error);
      return [];
    }
  }

  /**
   * Get full club data - requires authentication and proper permissions
   * This should only be used in authenticated contexts (admin dashboards, etc.)
   */
  static async getFullClubData(clubId?: string) {
    try {
      const query = supabase.from('clubs').select('*');
      
      if (clubId) {
        query.eq('id', clubId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching full club data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error in getFullClubData:', error);
      return null;
    }
  }
}