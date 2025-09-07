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