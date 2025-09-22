import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { canAccessRoute, canSeeElement, getUnauthorizedRedirect } from '@/lib/roleMatrix';
import { toast } from '@/hooks/use-toast';
import { showSupabaseError } from '@/lib/showSupabaseError';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'PLAYER' | 'INSURANCE_PARTNER';

interface UseRoleGuardOptions {
  requiredRoles?: UserRole[];
  redirectOnUnauthorized?: boolean;
  showToastOnUnauthorized?: boolean;
  customRedirectPath?: string;
}

interface UseRoleGuardReturn {
  hasAccess: boolean;
  userRole: UserRole | null;
  isLoading: boolean;
  canSee: (elementName: string) => boolean;
  requireRole: (roles: UserRole[]) => boolean;
}

/**
 * Hook for in-page role-based access control
 */
export const useRoleGuard = (options: UseRoleGuardOptions = {}): UseRoleGuardReturn => {
  const {
    requiredRoles,
    redirectOnUnauthorized = true,
    showToastOnUnauthorized = true,
    customRedirectPath
  } = options;

  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = profile?.role || null;
  const currentPath = location.pathname;

  // Check if user has access to current route
  const hasRouteAccess = canAccessRoute(currentPath, userRole);
  
  // Check if user meets specific role requirements
  const hasRoleAccess = !requiredRoles || 
    (userRole && requiredRoles.includes(userRole));

  const hasAccess = hasRouteAccess && hasRoleAccess;

  // Handle unauthorized access
  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      // Not authenticated
      if (redirectOnUnauthorized) {
        navigate('/auth', { state: { from: currentPath }, replace: true });
      }
      return;
    }

    if (!profile) {
      // Profile loading failed
      if (showToastOnUnauthorized) {
        toast({
          title: "Profile Error",
          description: "Unable to load your profile. Please try signing in again.",
          variant: "destructive"
        });
      }
      
      if (redirectOnUnauthorized) {
        navigate('/auth', { replace: true });
      }
      return;
    }

    if (!hasAccess) {
      // Access denied
      if (showToastOnUnauthorized) {
        const roleText = userRole?.toLowerCase() || 'your';
        toast({
          title: "Access Denied",
          description: `This page requires different permissions than ${roleText} account provides.`,
          variant: "destructive"
        });
      }

      if (redirectOnUnauthorized) {
        const redirectPath = customRedirectPath || 
          getUnauthorizedRedirect(currentPath, userRole);
        navigate(redirectPath, { replace: true });
      }
    }
  }, [
    loading, 
    user, 
    profile, 
    hasAccess, 
    userRole, 
    currentPath, 
    navigate, 
    redirectOnUnauthorized, 
    showToastOnUnauthorized, 
    customRedirectPath
  ]);

  // Helper function to check element visibility
  const canSee = (elementName: string): boolean => {
    return canSeeElement(currentPath, elementName, userRole);
  };

  // Helper function to check if user has specific roles
  const requireRole = (roles: UserRole[]): boolean => {
    return userRole ? roles.includes(userRole) : false;
  };

  return {
    hasAccess,
    userRole,
    isLoading: loading,
    canSee,
    requireRole
  };
};

/**
 * Hook specifically for page-level protection (simpler version)
 */
export const usePageProtection = (requiredRoles: UserRole[]) => {
  return useRoleGuard({ 
    requiredRoles,
    redirectOnUnauthorized: true,
    showToastOnUnauthorized: true
  });
};