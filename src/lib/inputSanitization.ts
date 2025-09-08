// Comprehensive input sanitization and validation utilities

// HTML entity encoding to prevent XSS
export const htmlEncode = (str: string): string => {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
};

// Remove HTML tags completely
export const stripHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  
  return str.replace(/<[^>]*>/g, '');
};

// Sanitize text input (for names, descriptions, etc.)
export const sanitizeText = (str: string, maxLength: number = 255): string => {
  if (typeof str !== 'string') return '';
  
  return stripHtml(str.trim())
    .substring(0, maxLength)
    .replace(/[<>{}]/g, ''); // Remove potential script injection chars
};

// Email validation and sanitization
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';
  
  const cleaned = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(cleaned)) {
    throw new Error('Invalid email format');
  }
  
  return cleaned;
};

// Phone number sanitization
export const sanitizePhone = (phone: string): string => {
  if (typeof phone !== 'string') return '';
  
  // Allow only digits and common phone formatting characters
  const phoneRegex = /^[\+\-\s\(\)\d]+$/;
  const cleaned = phone.trim();
  
  if (cleaned && !phoneRegex.test(cleaned)) {
    throw new Error('Invalid phone number format');
  }
  
  return cleaned;
};

// Name validation (for first/last names)
export const sanitizeName = (name: string): string => {
  if (typeof name !== 'string') return '';
  
  // Allow letters, spaces, hyphens, apostrophes, and common international characters
  const nameRegex = /^[a-zA-ZÀ-ÿ\s\-'\.]+$/;
  const cleaned = name.trim();
  
  if (cleaned && !nameRegex.test(cleaned)) {
    throw new Error('Names can only contain letters, spaces, hyphens, apostrophes, and periods');
  }
  
  if (cleaned.length > 50) {
    throw new Error('Name must be 50 characters or less');
  }
  
  return cleaned;
};

// URL validation and sanitization
export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') return '';
  
  const cleaned = url.trim();
  
  try {
    const urlObj = new URL(cleaned);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are allowed');
    }
    
    return urlObj.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
};

// Number validation with range checking
export const sanitizeNumber = (
  value: number | string, 
  min: number, 
  max: number, 
  fieldName: string = 'Value'
): number => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  
  return num;
};

// Generic form data sanitizer
export const sanitizeFormData = <T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, {
    type: 'text' | 'email' | 'phone' | 'name' | 'url' | 'number';
    required?: boolean;
    maxLength?: number;
    min?: number;
    max?: number;
  }>
): T => {
  const sanitized = {} as T;
  
  for (const [key, rule] of Object.entries(rules)) {
    const value = data[key];
    
    // Check required fields
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      throw new Error(`${key} is required`);
    }
    
    // Skip sanitization for empty optional fields
    if (!value && !rule.required) {
      sanitized[key as keyof T] = value;
      continue;
    }
    
    try {
      switch (rule.type) {
        case 'text':
          sanitized[key as keyof T] = sanitizeText(value, rule.maxLength) as T[keyof T];
          break;
        case 'email':
          sanitized[key as keyof T] = sanitizeEmail(value) as T[keyof T];
          break;
        case 'phone':
          sanitized[key as keyof T] = sanitizePhone(value) as T[keyof T];
          break;
        case 'name':
          sanitized[key as keyof T] = sanitizeName(value) as T[keyof T];
          break;
        case 'url':
          sanitized[key as keyof T] = sanitizeUrl(value) as T[keyof T];
          break;
        case 'number':
          sanitized[key as keyof T] = sanitizeNumber(
            value, 
            rule.min || 0, 
            rule.max || 100, 
            key
          ) as T[keyof T];
          break;
        default:
          sanitized[key as keyof T] = value;
      }
    } catch (error) {
      throw new Error(`${key}: ${(error as Error).message}`);
    }
  }
  
  return sanitized;
};

// SQL injection prevention patterns
export const containsSqlInjection = (input: string): boolean => {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /['"];?\s*(\bOR\b|\bAND\b|\bUNION\b)/i,
    /\bxp_\w+/i,
    /\bsp_\w+/i,
    /--/,
    /\/\*/,
    /\*\//,
    /;/
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// XSS prevention patterns
export const containsXss = (input: string): boolean => {
  if (typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
    /<[^>]*\s(src|href)\s*=\s*["']?\s*javascript:/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

// Comprehensive security check
export const isInputSecure = (input: string): { safe: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  if (containsSqlInjection(input)) {
    issues.push('Potential SQL injection detected');
  }
  
  if (containsXss(input)) {
    issues.push('Potential XSS attack detected');
  }
  
  return {
    safe: issues.length === 0,
    issues
  };
};