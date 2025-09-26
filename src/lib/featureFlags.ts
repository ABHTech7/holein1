// Feature flags for Player Journey V2 - Environment driven
import { isDemoModeEnabled } from './demoMode';

export const isFeatureEnabled = (flag: string): boolean => {
  const envValue = import.meta.env[flag];
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === true;
  }
  
  // Fallback defaults
  const defaults: Record<string, boolean> = {
    VITE_PLAYER_JOURNEY_V2_ENABLED: false,
    VITE_ENHANCED_WIN_CLAIM_ENABLED: true,
    VITE_AUTO_MISS_JOB_ENABLED: true,
    VITE_PAYMENT_PROVIDER_STRIPE_ENABLED: true,
    VITE_PAYMENT_PROVIDER_FONDY_ENABLED: false,
    VITE_PAYMENT_PROVIDER_WISE_ENABLED: false,
    VITE_FILE_UPLOAD_VALIDATION_ENABLED: true,
    VITE_COPY_ENGINE_ENABLED: true,
    VITE_MOBILE_FIRST_UI_UI_ENABLED: true,
    // New Auth/UX Feature Flags
    VITE_ENHANCED_ROLE_GUARDS: true,
    VITE_ENTRY_CONTEXT_PERSISTENCE: true,
    VITE_RESEND_MAGIC_LINK: true,
    VITE_BANKING_BANNER_FIX: true,
    // Demo mode feature flags
    VITE_DEMO_MODE_ENABLED: false,
  };
  
  return defaults[flag] ?? false;
};

export const getConfig = () => ({
  verificationTimeoutHours: Number(import.meta.env.VITE_VERIFICATION_TIMEOUT_HOURS) || 12,
});

// Feature-specific configurations  
export const getFeatureConfig = () => ({
  verificationTimeoutHours: getConfig().verificationTimeoutHours,
  paymentProviders: {
    stripe: isFeatureEnabled('VITE_PAYMENT_PROVIDER_STRIPE_ENABLED'),
    fondy: isFeatureEnabled('VITE_PAYMENT_PROVIDER_FONDY_ENABLED'),
    wise: isFeatureEnabled('VITE_PAYMENT_PROVIDER_WISE_ENABLED'),
  },
});

export const getPaymentMode = (): string => {
  const stripe = isFeatureEnabled('VITE_PAYMENT_PROVIDER_STRIPE_ENABLED');
  const fondy = isFeatureEnabled('VITE_PAYMENT_PROVIDER_FONDY_ENABLED');
  const wise = isFeatureEnabled('VITE_PAYMENT_PROVIDER_WISE_ENABLED');
  
  // If no payment providers are enabled
  if (!stripe && !fondy && !wise) {
    return "No-Payments";
  }
  
  // If Stripe is enabled, check environment mode
  if (stripe) {
    return import.meta.env.MODE === 'production' ? "Stripe (Live)" : "Stripe (Test)";
  }
  
  // If other providers are enabled
  if (fondy) return "Fondy";
  if (wise) return "Wise";
  
  return "Unknown";
};

// Demo mode utilities
export const getDemoModeConfig = () => ({
  isDemoModeEnabled: isDemoModeEnabled(),
  shouldShowDemoData: isDemoModeEnabled(),
  shouldShowDemoTools: isDemoModeEnabled(),
  shouldFilterDemoData: !isDemoModeEnabled(),
});

// Development utilities
export const logFeatureFlags = () => {
  console.group('🚩 Feature Flags');
  const flags = [
    'VITE_PLAYER_JOURNEY_V2_ENABLED',
    'VITE_ENHANCED_WIN_CLAIM_ENABLED',
    'VITE_PAYMENT_PROVIDER_STRIPE_ENABLED',
    'VITE_PAYMENT_PROVIDER_FONDY_ENABLED',
    'VITE_PAYMENT_PROVIDER_WISE_ENABLED',
    'VITE_DEMO_MODE_ENABLED'
  ];
  
  flags.forEach(flag => {
    const currentValue = isFeatureEnabled(flag);
    const envValue = import.meta.env[flag];
    const status = currentValue ? '✅' : '❌';
    const source = envValue !== undefined ? ' (env)' : ' (default)';
    console.log(`${status} ${flag}: ${currentValue}${source}`);
  });
  
  // Log demo mode status
  const demoMode = isDemoModeEnabled();
  console.log(`${demoMode ? '✅' : '❌'} Demo Mode: ${demoMode} (domain: ${window.location.hostname})`);
  
  console.groupEnd();
};

// Call this in development to see current flag status
if (import.meta.env.DEV) {
  // Uncomment to log flags on startup
  // logFeatureFlags();
}