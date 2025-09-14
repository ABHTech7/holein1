// Feature flags for Player Journey V2
export const FEATURE_FLAGS = {
  PLAYER_JOURNEY_V2_ENABLED: false, // Set to true to enable Player Journey V2
  ENHANCED_WIN_CLAIM_ENABLED: true,
  AUTO_MISS_JOB_ENABLED: true,
  PAYMENT_PROVIDER_STRIPE_ENABLED: true,
  PAYMENT_PROVIDER_FONDY_ENABLED: false,
  PAYMENT_PROVIDER_WISE_ENABLED: false,
  FILE_UPLOAD_VALIDATION_ENABLED: true,
  COPY_ENGINE_ENABLED: true,
  MOBILE_FIRST_UI_ENABLED: true,
  VERIFICATION_TIMEOUT_HOURS: 12,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  // Check environment variable first, then fall back to default
  const envValue = getEnvFlag(flag);
  if (envValue !== null) {
    return envValue;
  }
  
  return FEATURE_FLAGS[flag] as boolean;
};

const getEnvFlag = (flag: FeatureFlag): boolean | null => {
  // In a real implementation, this would read from environment variables
  // For now, we'll simulate checking environment variables
  const envVars: Record<string, string | undefined> = {
    PLAYER_JOURNEY_V2_ENABLED: undefined, // Would be process.env.PLAYER_JOURNEY_V2_ENABLED
    ENHANCED_WIN_CLAIM_ENABLED: undefined,
    AUTO_MISS_JOB_ENABLED: undefined,
    PAYMENT_PROVIDER_STRIPE_ENABLED: undefined,
    PAYMENT_PROVIDER_FONDY_ENABLED: undefined,
    PAYMENT_PROVIDER_WISE_ENABLED: undefined,
    FILE_UPLOAD_VALIDATION_ENABLED: undefined,
    COPY_ENGINE_ENABLED: undefined,
    MOBILE_FIRST_UI_ENABLED: undefined,
  };

  const value = envVars[flag];
  if (value === undefined) return null;
  
  return value.toLowerCase() === 'true';
};

// Feature-specific configurations
export const getFeatureConfig = () => ({
  verificationTimeoutHours: FEATURE_FLAGS.VERIFICATION_TIMEOUT_HOURS,
  paymentProviders: {
    stripe: isFeatureEnabled('PAYMENT_PROVIDER_STRIPE_ENABLED'),
    fondy: isFeatureEnabled('PAYMENT_PROVIDER_FONDY_ENABLED'),
    wise: isFeatureEnabled('PAYMENT_PROVIDER_WISE_ENABLED'),
  },
});

// Development utilities
export const getAllFlags = () => FEATURE_FLAGS;

export const logFeatureFlags = () => {
  console.group('🚩 Feature Flags');
  Object.entries(FEATURE_FLAGS).forEach(([key, defaultValue]) => {
    const currentValue = isFeatureEnabled(key as FeatureFlag);
    const status = currentValue ? '✅' : '❌';
    const override = currentValue !== defaultValue ? ' (overridden)' : '';
    console.log(`${status} ${key}: ${currentValue}${override}`);
  });
  console.groupEnd();
};

// Call this in development to see current flag status
if (process.env.NODE_ENV === 'development') {
  // Uncomment to log flags on startup
  // logFeatureFlags();
}