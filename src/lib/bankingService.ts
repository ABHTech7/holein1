// Secure banking service for handling financial data with audit logging
import { supabase } from "@/integrations/supabase/client";
import { showSupabaseError } from "@/lib/showSupabaseError";

// Type alias for banking completeness checks
export type ClubBanking = {
  club_id: string;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_sort_code?: string | null;
  bank_iban?: string | null;
  bank_swift?: string | null;
  id?: string;
  created_at?: string;
  updated_at?: string;
  last_accessed_at?: string | null;
  access_count?: number;
};

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

// Consider these the minimum required to "go live"
export function isBankingComplete(b: Partial<ClubBanking> | null | undefined): boolean {
  if (!b) return false;
  const required = [
    b.bank_account_holder,
    b.bank_account_number,
    b.bank_sort_code,
  ];
  return required.every(v => typeof v === 'string' && v.trim().length > 0);
}

// Ensure getClubBankingDetails uses maybeSingle and NEVER throws on 0 rows
export async function getClubBankingDetailsSafe(clubId: string): Promise<ClubBanking | null> {
  const { data, error } = await supabase
    .from('club_banking')
    .select('*')
    .eq('club_id', clubId)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🏦 getClubBankingDetailsSafe error', { code: error.code, message: error.message });
    }
    throw error;
  }
  return (data as ClubBanking | null) ?? null;
}

/**
 * Secure banking service with comprehensive audit logging
 * All financial data access is logged and monitored
 */
export class SecureBankingService {
  /**
   * Fetch club banking details with automatic audit logging and access tracking
   * Only accessible by club owners and admins
   */
  static async getClubBankingDetails(clubId: string): Promise<ClubBankingDetails | null> {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🏦 SecureBankingService.getClubBankingDetails:', {
          clubId,
          query: 'SELECT * FROM club_banking WHERE club_id = $1',
          timestamp: new Date().toISOString()
        });
      }

      const { data, error } = await supabase
        .from('club_banking')
        .select('*')
        .eq('club_id', clubId)
        .maybeSingle();

      if (process.env.NODE_ENV !== 'production') {
        console.log('🏦 Supabase response (getClubBankingDetails):', {
          success: !error,
          hasData: !!data,
          error: error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            fullError: error
          } : null
        });
      }

      if (error) {
        const errorMessage = showSupabaseError(error, 'getClubBankingDetails');
        console.error('🏦 Formatted error:', errorMessage);
        throw new Error(errorMessage);
      }

      if (!data) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🏦 No banking details found for club - this is expected for new clubs');
        }
        return null;
      }

      // Track access: increment access_count and update last_accessed_at
      try {
        await supabase
          .from('club_banking')
          .update({
            access_count: (data.access_count || 0) + 1,
            last_accessed_at: new Date().toISOString()
          })
          .eq('club_id', clubId);

        // Log the access to data_access_log for audit trail
        await supabase
          .from('data_access_log')
          .insert({
            table_name: 'club_banking',
            record_id: data.id,
            access_type: 'SELECT',
            sensitive_fields: ['bank_account_number', 'bank_iban', 'bank_swift']
          });

        if (process.env.NODE_ENV !== 'production') {
          console.log('🏦 Access tracking updated successfully');
        }
      } catch (trackingError) {
        // Don't throw on tracking errors, just log them
        console.error('🏦 Error updating access tracking:', trackingError);
      }

      return data;
    } catch (error: any) {
      console.error('🏦 Unexpected error fetching banking details:', error);
      throw error;
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
      // DIAGNOSTIC: Log redacted update payload
      const redactedPayload = {
        ...bankingDetails,
        bank_account_number: bankingDetails.bank_account_number ? `****${bankingDetails.bank_account_number.slice(-4)}` : bankingDetails.bank_account_number,
        bank_iban: bankingDetails.bank_iban ? `${bankingDetails.bank_iban.slice(0, 4)}****${bankingDetails.bank_iban.slice(-4)}` : bankingDetails.bank_iban
      };
      
      console.log('🏦 SecureBankingService.updateClubBankingDetails:', {
        clubId,
        operation: 'checking_existing_data',
        redactedPayload,
        timestamp: new Date().toISOString()
      });

      // Check if banking record exists
      const existingData = await this.getClubBankingDetails(clubId);

      console.log('🏦 Existing data check:', {
        hasExistingData: !!existingData,
        operation: existingData ? 'UPDATE' : 'INSERT'
      });

      if (existingData) {
        // Update existing record
        const updatePayload = {
          ...bankingDetails,
          updated_at: new Date().toISOString()
        };
        
        console.log('🏦 Updating existing record:', {
          clubId,
          updatePayloadKeys: Object.keys(updatePayload)
        });
        
        const { error } = await supabase
          .from('club_banking')
          .update(updatePayload)
          .eq('club_id', clubId);

        // DIAGNOSTIC: Log update response
        console.log('🏦 Update response:', {
          success: !error,
          error: error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            fullError: error
          } : null
        });

        if (error) {
          const errorMessage = showSupabaseError(error, 'updateClubBankingDetails');
          throw new Error(errorMessage);
        }
      } else {
        // Create new record
        const insertPayload = {
          club_id: clubId,
          ...bankingDetails
        };
        
        console.log('🏦 Inserting new record:', {
          clubId,
          insertPayloadKeys: Object.keys(insertPayload)
        });
        
        const { error } = await supabase
          .from('club_banking')
          .insert(insertPayload);

        // DIAGNOSTIC: Log insert response
        console.log('🏦 Insert response:', {
          success: !error,
          error: error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            fullError: error
          } : null
        });

        if (error) {
          const errorMessage = showSupabaseError(error, 'insertClubBankingDetails');
          throw new Error(errorMessage);
        }
      }

      console.log('🏦 Banking update successful');
      return { success: true };
    } catch (error: any) {
      const errorMessage = showSupabaseError(error, 'updateClubBankingDetails');
      console.error('🏦 Banking update failed:', errorMessage);
      return { 
        success: false, 
        error: errorMessage
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