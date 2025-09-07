/**
 * Format phone number to E.164 international standard
 * Handles UK numbers primarily but supports basic international formatting
 */
export const formatToE164 = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If already starts with country code
  if (digits.startsWith('44') && digits.length >= 13) {
    return '+' + digits;
  }
  
  // UK mobile numbers starting with 07
  if (digits.startsWith('07') && digits.length === 11) {
    return '+44' + digits.slice(1);
  }
  
  // UK mobile numbers starting with 7 (missing leading 0)
  if (digits.startsWith('7') && digits.length === 10) {
    return '+44' + digits;
  }
  
  // US/Canada numbers
  if (digits.startsWith('1') && digits.length === 11) {
    return '+' + digits;
  }
  
  // Other international numbers - basic validation
  if (digits.length >= 10 && digits.length <= 15) {
    // If no country code detected, assume UK for now
    if (digits.length === 11 && digits.startsWith('0')) {
      return '+44' + digits.slice(1);
    }
    // Default - assume already correct or add +44 for 10-digit UK numbers
    if (digits.length === 10) {
      return '+44' + digits;
    }
    return '+' + digits;
  }
  
  throw new Error('Invalid phone number format');
};

/**
 * Validate phone number for competition eligibility
 */
export const validatePhone = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 10) {
    return { isValid: false, error: 'Phone number is too short' };
  }
  
  if (digits.length > 15) {
    return { isValid: false, error: 'Phone number is too long' };
  }
  
  try {
    formatToE164(phone);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid phone number format' };
  }
};

/**
 * Format phone number for display (UK friendly)
 */
export const formatForDisplay = (e164Phone: string): string => {
  if (!e164Phone.startsWith('+')) return e164Phone;
  
  // UK numbers
  if (e164Phone.startsWith('+44')) {
    const digits = e164Phone.slice(3);
    if (digits.length === 10 && digits.startsWith('7')) {
      return `07${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
  }
  
  // US/Canada numbers  
  if (e164Phone.startsWith('+1')) {
    const digits = e164Phone.slice(2);
    if (digits.length === 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  }
  
  // Default - just return as is
  return e164Phone;
};
