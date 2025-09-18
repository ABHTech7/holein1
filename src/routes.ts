/**
 * Central Route Registry - TypeScript-safe route constants
 * Use these constants instead of hardcoded strings throughout the app
 */

export const ROUTES = {
  // Public Routes
  HOME: '/',
  AUTH: '/auth',
  AUTH_CALLBACK: '/auth/callback',
  PARTNERSHIP: '/partnership',
  
  // Player Routes
  PLAYER: {
    LOGIN: '/players/login',
    ENTRIES: '/players/entries',
  },
  
  // Club Routes
  CLUB: {
    SIGNUP: '/clubs/signup',
    DASHBOARD: '/dashboard/club',
    REVENUE: '/dashboard/club/revenue',
    ENTRIES: '/dashboard/club/entries',
    BANKING: '/dashboard/club/banking',
    COMPETITIONS: '/dashboard/club/competitions',
    COMPETITIONS_NEW: '/dashboard/club/competitions/new',
    SUPPORT: '/dashboard/club/support',
    CLAIMS: '/dashboard/club/claims',
  },
  
  // Admin Routes
  ADMIN: {
    DASHBOARD: '/dashboard/admin',
    PLAYERS: '/dashboard/admin/players',
    CLUBS: '/dashboard/admin/clubs',
    COMPETITIONS: '/dashboard/admin/competitions',
    COMPETITIONS_NEW: '/dashboard/admin/competitions/new',
    REVENUE: '/dashboard/admin/revenue',
    REVENUE_BREAKDOWN: '/dashboard/admin/revenue/breakdown',
    ENTRIES: '/dashboard/admin/entries',
    CLAIMS: '/dashboard/admin/claims',
    USERS: '/dashboard/admin/users',
  },
  
  // Competition & Entry Routes
  COMPETITION: {
    BROWSE: '/competitions', // Add missing competitions browse route
    ENTRY: (clubSlug: string, competitionSlug: string) => 
      `/competition/${clubSlug}/${competitionSlug}`,
    ENTER: (clubSlug: string, competitionSlug: string) => 
      `/competition/${clubSlug}/${competitionSlug}/enter`,
    DETAIL: (id: string) => `/competitions/${id}`,
    EDIT: (id: string) => `/dashboard/admin/competitions/${id}/edit`,
  },
  
  // Entry Flow Routes
  ENTRY: {
    CONFIRMATION: (entryId: string) => `/entry/${entryId}/confirmation`,
    SUCCESS: (entryId: string) => `/entry-success/${entryId}`,
    WIN_CLAIM: (entryId: string) => `/win-claim/${entryId}`,
    WIN_CLAIM_LEGACY: (entryId: string) => `/win-claim-legacy/${entryId}`,
  },
  
  // Detail Routes
  DETAIL: {
    CLUB: (clubId: string) => `/dashboard/admin/clubs/${clubId}`,
    PLAYER: (playerId: string) => `/dashboard/admin/players/${playerId}`,
    CLAIM: (verificationId: string) => `/claims/${verificationId}`,
    COMPETITION_ADMIN: (id: string) => `/dashboard/admin/competitions/${id}`,
    COMPETITION_CLUB: (id: string) => `/dashboard/club/competitions/${id}`,
  },
  
  // Policy Routes
  POLICIES: {
    PRIVACY: '/policies/privacy',
    TERMS: '/policies/terms',
    COOKIES: '/policies/cookies',
    INSURANCE: '/policies/insurance',
    ACCESSIBILITY: '/policies/accessibility',
  },
  
  // Error Routes
  ERROR: {
    NOT_FOUND: '/404',
    SERVER_ERROR: '/500',
  },
  
  // Development Routes
  DEV: {
    DEMO: '/dev/demo',
    STYLEGUIDE: '/styleguide',
  },
} as const;

/**
 * Role-based navigation helpers
 */
export const ROLE_DASHBOARDS = {
  ADMIN: ROUTES.ADMIN.DASHBOARD,
  CLUB: ROUTES.CLUB.DASHBOARD,
  PLAYER: ROUTES.PLAYER.ENTRIES,
} as const;

/**
 * Get dashboard route for user role
 */
export const getDashboardRoute = (role: 'ADMIN' | 'CLUB' | 'PLAYER' | null): string => {
  if (!role) return ROUTES.HOME;
  return ROLE_DASHBOARDS[role] || ROUTES.HOME;
};

/**
 * Check if current path matches route (for active states)
 */
export const isActiveRoute = (currentPath: string, targetRoute: string): boolean => {
  return currentPath === targetRoute;
};

/**
 * Check if current path starts with route prefix (for section highlighting)
 */
export const isActiveSectionRoute = (currentPath: string, sectionPrefix: string): boolean => {
  return currentPath.startsWith(sectionPrefix);
};