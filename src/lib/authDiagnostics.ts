/**
 * Auth Diagnostics Utility
 * Logs current window.location.origin and checks for SITE_URL mismatches
 */

const EXPECTED_SITE_URL = import.meta.env.VITE_EXPECTED_SITE_URL || 'https://demo.holein1challenge.co.uk';

/**
 * Log current auth configuration and check for mismatches
 */
export const logAuthDiagnostics = (): void => {
  const currentOrigin = window.location.origin;
  
  console.log('[AuthDiag] origin=' + currentOrigin);
  console.log('[AuthDiag] Expected production site=' + EXPECTED_SITE_URL);
  
  if (currentOrigin !== EXPECTED_SITE_URL) {
    console.warn(
      '[AuthDiag] WARNING: origin does not match configured Site URL/Redirect URLs. ' +
      `Current: ${currentOrigin}, Expected: ${EXPECTED_SITE_URL}. ` +
      'This may cause PKCE "code verifier" errors. ' +
      'Update SITE_URL in Supabase Authentication settings.'
    );
  } else {
    console.log('[AuthDiag] Site URL configuration looks correct');
  }
};

/**
 * Log the emailRedirectTo URL being used for magic links
 */
export const logEmailRedirectTo = (redirectUrl: string): void => {
  console.log('[AuthDiag] redirectURL=' + redirectUrl);
};