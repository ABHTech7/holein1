/**
 * Centralized slug utilities for consistent URL generation and validation
 */

/**
 * Create slug from text with consistent rules
 */
export const createSlug = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/'/g, '') // Remove apostrophes
    .replace(/&/g, 'and') // Replace & with 'and'
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // Replace multiple consecutive hyphens with single hyphen
};

/**
 * Validate if a string is a valid slug format
 */
export const isValidSlug = (text: string): boolean => {
  if (!text) return false;
  
  // Must be lowercase, contain only letters, numbers, and hyphens
  // Cannot start or end with hyphens
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(text);
};

/**
 * Compare two texts by their slug equivalents
 */
export const slugsMatch = (text1: string, text2: string): boolean => {
  return createSlug(text1) === createSlug(text2);
};

/**
 * Debug function to show slug generation process
 */
export const debugSlugGeneration = (text: string, context: string = '') => {
  const steps = {
    original: text,
    trimmed: text.trim(),
    lowercase: text.trim().toLowerCase(),
    noApostrophes: text.trim().toLowerCase().replace(/'/g, ''),
    replaceAnd: text.trim().toLowerCase().replace(/'/g, '').replace(/&/g, 'and'),
    replaceNonAlnum: text.trim().toLowerCase().replace(/'/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-'),
    final: createSlug(text)
  };
  
  console.log(`🔧 Slug generation${context ? ` (${context})` : ''}:`, steps);
  return steps.final;
};