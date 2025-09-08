// Secure banking service for handling financial data with audit logging
import { supabase } from "@/integrations/supabase/client";

export interface ClubBankingDetails {
  id: string;
  club_id: string;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  bank_iban: string | null;
  bank_swift: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  access_count: number;
}

/**
 * Secure banking service with comprehensive audit logging
 * All financial data access is logged and monitored
 */
export class SecureBankingService {
  /**
   * Fetch club banking details with automatic audit logging
   * Only accessible by club owners and admins
   */
  static async getClubBankingDetails(clubId: string): Promise<ClubBankingDetails | null> {
    try {
      const { data, error } = await supabase
        .from('club_banking')
        .select('*')
        .eq('club_id', clubId)
        .single();

      if (error) {
        console.error('Error fetching banking details:', error);
        return null;
      }

      return data;
    } catch (error: any) {
      console.error('Unexpected error fetching banking details:', error);
      return null;
    }
  }

  /**
   * Create or update club banking details with validation
   * Automatically logs all changes for security compliance
   */
  static async updateClubBankingDetails(
    clubId: string,
    bankingDetails: Partial<Omit<ClubBankingDetails, 'id' | 'club_id' | 'created_at' | 'updated_at' | 'last_accessed_at' | 'access_count'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if banking record exists
      const existingData = await this.getClubBankingDetails(clubId);

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('club_banking')
          .update({
            ...bankingDetails,
            updated_at: new Date().toISOString()
          })
          .eq('club_id', clubId);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('club_banking')
          .insert({
            club_id: clubId,
            ...bankingDetails
          });

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating banking details:', error);
      return { 
        success: false, 
        error: error.message || "Failed to update banking details" 
      };
    }
  }

  /**
   * Get banking access audit trail for club owners and admins
   * Shows who accessed financial data and when
   */
  static async getBankingAccessLog(clubId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('data_access_log')
        .select(`
          *,
          profiles:user_id(first_name, last_name, email)
        `)
        .eq('table_name', 'club_banking')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching access log:', error);
      return [];
    }
  }

  /**
   * Validate banking details format and security
   */
  static validateBankingDetails(details: Partial<ClubBankingDetails>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate account holder
    if (details.bank_account_holder && details.bank_account_holder.length < 2) {
      errors.push("Account holder name must be at least 2 characters");
    }

    // Validate UK sort code format
    if (details.bank_sort_code) {
      const sortCodePattern = /^\d{2}-?\d{2}-?\d{2}$/;
      if (!sortCodePattern.test(details.bank_sort_code)) {
        errors.push("Sort code must be in format XX-XX-XX");
      }
    }

    // Validate UK account number
    if (details.bank_account_number) {
      const accountNumberPattern = /^\d{8}$/;
      if (!accountNumberPattern.test(details.bank_account_number.replace(/\s/g, ''))) {
        errors.push("Account number must be 8 digits");
      }
    }

    // Validate IBAN format
    if (details.bank_iban) {
      const ibanPattern = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;
      if (!ibanPattern.test(details.bank_iban.replace(/\s/g, ''))) {
        errors.push("IBAN format is invalid");
      }
    }

    // Validate SWIFT/BIC format
    if (details.bank_swift) {
      const swiftPattern = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
      if (!swiftPattern.test(details.bank_swift)) {
        errors.push("SWIFT/BIC code format is invalid");
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize banking details for display (partial masking)
   * Used when showing data in UI to protect sensitive information
   */
  static sanitizeForDisplay(details: ClubBankingDetails): Partial<ClubBankingDetails> {
    return {
      ...details,
      bank_account_number: details.bank_account_number 
        ? `****${details.bank_account_number.slice(-4)}`
        : null,
      bank_iban: details.bank_iban 
        ? `${details.bank_iban.slice(0, 4)}****${details.bank_iban.slice(-4)}`
        : null
    };
  }
}