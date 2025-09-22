/**
 * Centralized Role Permission Matrix
 * Defines what each role can access and see
 */

import { ROUTES } from '@/routes';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'PLAYER';
export type RouteCategory = 'public' | 'auth' | 'admin' | 'club' | 'player' | 'entry';

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
  category: RouteCategory;
  requiresAuth: boolean;
  redirectOnUnauthorized?: string;
  description: string;
}

export interface PageElement {
  name: string;
  visibleToRoles: UserRole[];
  type: 'button' | 'link' | 'tab' | 'section' | 'modal';
}

// Route permissions matrix
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Public routes
  { path: '/', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Homepage' },
  { path: '/auth', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Authentication page' },
  { path: '/auth/callback', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'auth', requiresAuth: false, description: 'Authentication callback' },
  { path: '/partnership', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Partnership application' },
  { path: '/clubs/signup', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Club signup' },
  { path: '/players/login', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Player login' },

  // Policy routes (public)
  { path: '/policies/privacy', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Privacy policy' },
  { path: '/policies/terms', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Terms of service' },
  { path: '/policies/cookies', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Cookie policy' },
  { path: '/policies/insurance', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Insurance policy' },
  { path: '/policies/accessibility', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'public', requiresAuth: false, description: 'Accessibility policy' },

  // Competition entry routes (protected but flexible)
  { path: '/competition/:clubSlug/:competitionSlug', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'entry', requiresAuth: false, description: 'Competition entry page' },
  { path: '/competition/:clubSlug/:competitionSlug/enter', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'entry', requiresAuth: false, description: 'Competition entry form' },
  { path: '/entry-success/:entryId', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'entry', requiresAuth: true, redirectOnUnauthorized: '/auth', description: 'Entry success page' },
  { path: '/win-claim/:entryId', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'entry', requiresAuth: true, redirectOnUnauthorized: '/auth', description: 'Win claim page' },
  { path: '/win-claim-legacy/:entryId', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'entry', requiresAuth: true, redirectOnUnauthorized: '/auth', description: 'Legacy win claim page' },
  { path: '/entry/:entryId/confirmation', allowedRoles: ['ADMIN', 'CLUB', 'PLAYER'], category: 'entry', requiresAuth: true, redirectOnUnauthorized: '/auth', description: 'Entry confirmation' },

  // Player routes
  { path: '/players/entries', allowedRoles: ['PLAYER', 'ADMIN'], category: 'player', requiresAuth: true, description: 'Player entries dashboard' },

  // Club routes
  { path: '/dashboard/club', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'Club dashboard' },
  { path: '/dashboard/club/revenue', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'Club revenue' },
  { path: '/dashboard/club/entries', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'Club entries' },
  { path: '/dashboard/club/banking', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'Club banking' },
  { path: '/dashboard/club/competitions', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'Club competitions' },
  { path: '/dashboard/club/competitions/new', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'New club competition' },
  { path: '/dashboard/club/support', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'Club support' },
  { path: '/dashboard/club/claims', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'Club claims' },

  // Admin routes
  { path: '/dashboard/admin', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin dashboard' },
  { path: '/dashboard/admin/players', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin players' },
  { path: '/dashboard/admin/clubs', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin clubs' },
  { path: '/dashboard/admin/competitions', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin competitions' },
  { path: '/dashboard/admin/competitions/new', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'New admin competition' },
  { path: '/dashboard/admin/revenue', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin revenue' },
  { path: '/dashboard/admin/revenue/breakdown', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin revenue breakdown' },
  { path: '/dashboard/admin/entries', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin entries' },
  { path: '/dashboard/admin/claims', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin claims' },
  { path: '/dashboard/admin/users', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Admin user management' },

  // Detail routes
  { path: '/dashboard/admin/clubs/:clubId', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Club detail (admin)' },
  { path: '/dashboard/admin/players/:playerId', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Player detail (admin)' },
  { path: '/claims/:verificationId', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'CLUB'], category: 'admin', requiresAuth: true, description: 'Claim detail' },
  { path: '/dashboard/admin/competitions/:id', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Competition detail (admin)' },
  { path: '/dashboard/admin/competitions/:id/edit', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Competition edit (admin)' },
  { path: '/dashboard/club/competitions/:id', allowedRoles: ['CLUB', 'ADMIN'], category: 'club', requiresAuth: true, description: 'Competition detail (club)' },

  // Development routes
  { path: '/dev/demo', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Developer demo' },
  { path: '/styleguide', allowedRoles: ['SUPER_ADMIN', 'ADMIN'], category: 'admin', requiresAuth: true, description: 'Style guide' },
];

// Page element visibility matrix
export const PAGE_ELEMENTS: Record<string, PageElement[]> = {
  '/dashboard/admin': [
    { name: 'Player Management Card', visibleToRoles: ['SUPER_ADMIN', 'ADMIN'], type: 'section' },
    { name: 'Club Management Card', visibleToRoles: ['SUPER_ADMIN', 'ADMIN'], type: 'section' },
    { name: 'Revenue Analytics Card', visibleToRoles: ['SUPER_ADMIN', 'ADMIN'], type: 'section' },
    { name: 'System Settings Card', visibleToRoles: ['SUPER_ADMIN', 'ADMIN'], type: 'section' },
  ],
  '/dashboard/club': [
    { name: 'Competition Management Card', visibleToRoles: ['CLUB', 'ADMIN'], type: 'section' },
    { name: 'Revenue Card', visibleToRoles: ['CLUB', 'ADMIN'], type: 'section' },
    { name: 'Entries Card', visibleToRoles: ['CLUB', 'ADMIN'], type: 'section' },
    { name: 'Banking Setup Card', visibleToRoles: ['CLUB', 'ADMIN'], type: 'section' },
  ],
  '/players/entries': [
    { name: 'Active Entries Table', visibleToRoles: ['PLAYER', 'SUPER_ADMIN', 'ADMIN'], type: 'section' },
    { name: 'Entry History', visibleToRoles: ['PLAYER', 'SUPER_ADMIN', 'ADMIN'], type: 'section' },
    { name: 'Profile Settings Link', visibleToRoles: ['PLAYER', 'SUPER_ADMIN', 'ADMIN'], type: 'link' },
  ],
};

/**
 * Check if a role can access a specific route
 */
export const canAccessRoute = (route: string, userRole: UserRole | null): boolean => {
  if (!userRole) return false;
  
  const permission = ROUTE_PERMISSIONS.find(p => {
    // Handle dynamic routes with parameters
    const pathPattern = p.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pathPattern}$`);
    return regex.test(route);
  });
  
  if (!permission) {
    // If route not found in matrix, default to admin-only for safety
    return userRole === 'ADMIN';
  }
  
  return permission.allowedRoles.includes(userRole);
};

/**
 * Check if a role can see a specific page element
 */
export const canSeeElement = (routePath: string, elementName: string, userRole: UserRole | null): boolean => {
  if (!userRole) return false;
  
  const elements = PAGE_ELEMENTS[routePath];
  if (!elements) return true; // If no restrictions defined, allow
  
  const element = elements.find(e => e.name === elementName);
  if (!element) return true; // If element not found in matrix, allow
  
  return element.visibleToRoles.includes(userRole);
};

/**
 * Get appropriate redirect for unauthorized access
 */
export const getUnauthorizedRedirect = (route: string, userRole: UserRole | null): string => {
  const permission = ROUTE_PERMISSIONS.find(p => {
    const pathPattern = p.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pathPattern}$`);
    return regex.test(route);
  });
  
  if (permission?.redirectOnUnauthorized) {
    return permission.redirectOnUnauthorized;
  }
  
  // Default redirects based on role
  if (!userRole) return '/auth';
  
  // Super Admin gets same treatment as Admin for redirects
  const effectiveRole = userRole === 'SUPER_ADMIN' ? 'ADMIN' : userRole;
  
  // Manual role-based dashboard routing
  switch (effectiveRole) {
    case 'ADMIN':
      return ROUTES.ADMIN.DASHBOARD;
    case 'CLUB':
      return ROUTES.CLUB.DASHBOARD;
    case 'PLAYER':
      return ROUTES.PLAYER.ENTRIES;
    default:
      return ROUTES.HOME;
  }
};

/**
 * Get all routes accessible by a role (for testing)
 */
export const getRoutesForRole = (role: UserRole): RoutePermission[] => {
  return ROUTE_PERMISSIONS.filter(p => p.allowedRoles.includes(role));
};