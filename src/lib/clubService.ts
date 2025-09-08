import { supabase } from "@/integrations/supabase/client";

/**
 * Safe club data interface for public consumption
 * Only includes non-sensitive information
 */
export interface SafeClubData {
  id: string;
  name: string;
  website: string | null;
  logo_url: string | null;
  created_at: string;
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
  description: string | null;
  entry_fee: number | null;
  prize_pool: number | null;
  hole_number: number;
  status: string;
  start_date: string;
  end_date: string | null;
  is_year_round: boolean;
  hero_image_url: string | null;
  club_id: string;
  club_name: string;
  club_website: string | null;
  club_logo_url: string | null;
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
  static async getSafeCompetitionData(clubId: string): Promise<SafeCompetitionData[]> {
    try {
      const { data, error } = await supabase.rpc('get_safe_competition_data', {
        club_uuid: clubId,
        competition_slug_param: '' // We get all competitions, then filter by slug in the component
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