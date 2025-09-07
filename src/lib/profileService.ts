// Profile service for managing user profile data and completeness checks
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/useAuth";

/**
 * Check if a profile is complete (has required name information)
 */
export const isProfileComplete = (profile: Profile | null): boolean => {
  return !!(profile?.first_name?.trim());
};

/**
 * Check if a profile needs name collection
 */
export const needsNameCollection = (profile: Profile | null): boolean => {
  return !isProfileComplete(profile);
};

/**
 * Update user profile with name information
 */
export const updateProfileName = async (
  userId: string,
  firstName: string,
  lastName?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating profile name:', error);
    return { 
      success: false, 
      error: error.message || "Failed to update profile" 
    };
  }
};

/**
 * Fetch fresh profile data for a user
 */
export const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data as Profile;
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return null;
  }
};

/**
 * Extract name from OAuth metadata (fallback for OAuth flows)
 */
export const extractNameFromOAuth = (userMetadata: any): { firstName?: string; lastName?: string } => {
  if (!userMetadata) return {};

  // Try different common OAuth field patterns
  const firstName = userMetadata.first_name || 
                   userMetadata.given_name || 
                   userMetadata.name?.split(' ')?.[0];
                   
  const lastName = userMetadata.last_name || 
                  userMetadata.family_name || 
                  userMetadata.surname ||
                  (userMetadata.name?.split(' ')?.length > 1 ? 
                   userMetadata.name.split(' ').slice(1).join(' ') : undefined);

  return { firstName, lastName };
};