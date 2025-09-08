import { useState, useCallback } from 'react';
import { sanitizeFormData, isInputSecure } from '@/lib/inputSanitization';
import { toast } from '@/hooks/use-toast';

interface ValidationRule {
  type: 'text' | 'email' | 'phone' | 'name' | 'url' | 'number';
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
}

interface ValidationRules<T> {
  [K in keyof T]: ValidationRule;
}

interface UseSecureInputOptions<T> {
  initialData: T;
  validationRules: ValidationRules<T>;
  onValidationError?: (errors: string[]) => void;
}

export const useSecureInput = <T extends Record<string, any>>({
  initialData,
  validationRules,
  onValidationError
}: UseSecureInputOptions<T>) => {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback((key: keyof T, value: any): string | null => {
    try {
      // Security check for potential attacks
      if (typeof value === 'string') {
        const securityCheck = isInputSecure(value);
        if (!securityCheck.safe) {
          return `Security issue detected: ${securityCheck.issues.join(', ')}`;
        }
      }

      // Apply validation rules
      const rule = validationRules[key];
      if (!rule) return null;

      const testData = { [key]: value } as Partial<T>;
      const testRules = { [key]: rule } as Partial<ValidationRules<T>>;
      
      sanitizeFormData(testData, testRules);
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  }, [validationRules]);

  const updateField = useCallback((key: keyof T, value: any) => {
    // Validate the field
    const error = validateField(key, value);
    
    setErrors(prev => ({
      ...prev,
      [key]: error || undefined
    }));

    setData(prev => ({
      ...prev,
      [key]: value
    }));
  }, [validateField]);

  const validateAll = useCallback((): { isValid: boolean; sanitizedData?: T; errors?: string[] } => {
    setIsValidating(true);
    
    try {
      // First check for security issues
      const securityErrors: string[] = [];
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const securityCheck = isInputSecure(value);
          if (!securityCheck.safe) {
            securityErrors.push(`${key}: ${securityCheck.issues.join(', ')}`);
          }
        }
      });

      if (securityErrors.length > 0) {
        onValidationError?.(securityErrors);
        toast({
          title: "Security Issue Detected",
          description: "Please review your input and remove any potentially harmful content.",
          variant: "destructive"
        });
        return { isValid: false, errors: securityErrors };
      }

      // Sanitize all data
      const sanitizedData = sanitizeFormData(data, validationRules);
      
      // Clear all errors
      setErrors({});
      
      return { isValid: true, sanitizedData };
    } catch (error) {
      const errorMessage = (error as Error).message;
      const fieldErrors: string[] = [errorMessage];
      
      // Try to extract field-specific errors
      if (errorMessage.includes(':')) {
        const [field, message] = errorMessage.split(':');
        setErrors(prev => ({
          ...prev,
          [field.trim() as keyof T]: message.trim()
        }));
      }

      onValidationError?.(fieldErrors);
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive"
      });

      return { isValid: false, errors: fieldErrors };
    } finally {
      setIsValidating(false);
    }
  }, [data, validationRules, onValidationError]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
  }, [initialData]);

  const hasErrors = Object.values(errors).some(error => error);
  const isValid = !hasErrors && Object.keys(data).length > 0;

  return {
    data,
    errors,
    isValidating,
    hasErrors,
    isValid,
    updateField,
    validateAll,
    reset,
    setData
  };
};