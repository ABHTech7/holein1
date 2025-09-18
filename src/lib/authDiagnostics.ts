/**
 * Auth Diagnostics Utility
 * Logs current window.location.origin and checks for SITE_URL mismatches
 */

const EXPECTED_SITE_URL = 'https://demo.holein1challenge.co.uk';

/**
 * Log current auth configuration and check for mismatches
 */
export const logAuthDiagnostics = (): void => {
  const currentOrigin = window.location.origin;
  
  console.log('[AuthDiagnostics] Current configuration:', {
    currentOrigin,
    expectedSiteUrl: EXPECTED_SITE_URL,
    authCallbackUrl: `${currentOrigin}/auth/callback`
  });
  
  if (currentOrigin !== EXPECTED_SITE_URL) {
    console.warn(
      '[AuthDiagnostics] SITE_URL mismatch detected! ' +
      `Current: ${currentOrigin}, Expected: ${EXPECTED_SITE_URL}. ` +
      'This may cause magic-link "expired" errors. ' +
      'Update SITE_URL in Supabase Authentication settings.'
    );
  } else {
    console.log('[AuthDiagnostics] SITE_URL configuration looks correct');
  }
};