// Demo mode detection system for dual-domain setup
export const getDemoModeConfig = () => ({
  // Demo domains that should enable demo mode
  demoDomains: ['demo.holein1challenge.co.uk'],
  // Production domains that should disable demo mode  
  productionDomains: ['officialholein1.com'],
  // Environment variable fallback
  envOverride: import.meta.env.VITE_DEMO_MODE_ENABLED,
});

export const isDemoModeEnabled = (): boolean => {
  const config = getDemoModeConfig();
  
  // Check environment variable first (for development/override)
  if (config.envOverride !== undefined) {
    return config.envOverride === 'true' || config.envOverride === true;
  }
  
  // Get current hostname
  const hostname = window.location.hostname;
  
  // Check if current domain is in demo domains list
  if (config.demoDomains.includes(hostname)) {
    return true;
  }
  
  // Check if current domain is in production domains list
  if (config.productionDomains.includes(hostname)) {
    return false;
  }
  
  // Default for localhost and other domains - enable demo mode in development
  return import.meta.env.DEV;
};

export const getCurrentEnvironmentType = (): 'demo' | 'production' | 'development' => {
  const hostname = window.location.hostname;
  const config = getDemoModeConfig();
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }
  
  if (config.demoDomains.includes(hostname)) {
    return 'demo';
  }
  
  if (config.productionDomains.includes(hostname)) {
    return 'production';
  }
  
  return import.meta.env.DEV ? 'development' : 'production';
};

export const getDemoModeDisplayConfig = () => {
  const environmentType = getCurrentEnvironmentType();
  const isDemoMode = isDemoModeEnabled();
  
  return {
    environmentType,
    isDemoMode,
    showDemoIndicators: isDemoMode,
    showDemoTools: isDemoMode,
    filterDemoData: !isDemoMode,
    environmentBadge: {
      demo: { text: 'Demo Environment', variant: 'secondary' as const },
      production: { text: 'Production', variant: 'default' as const },
      development: { text: 'Development', variant: 'outline' as const },
    }[environmentType]
  };
};