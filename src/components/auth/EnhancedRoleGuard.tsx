import { ReactNode, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { ROUTES, getDashboardRoute } from '@/routes';
import { toast } from '@/hooks/use-toast';
import { showSupabaseError } from '@/lib/showSupabaseError';

interface EnhancedRoleGuardProps {
  children: ReactNode;
  allowedRoles: Array<'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'PLAYER' | 'INSURANCE_PARTNER'>;
  fallbackPath?: string;
  redirectToDashboard?: boolean;
  showUnauthorizedToast?: boolean;
}

const EnhancedRoleGuard = ({ 
  children, 
  allowedRoles, 
  fallbackPath,
  redirectToDashboard = true,
  showUnauthorizedToast = true
}: EnhancedRoleGuardProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const hasShownToastRef = useRef(false);

  // Show loading state with better UX
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Verifying access...</h3>
            <p className="text-muted-foreground text-sm">This won't take long</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate 
      to={ROUTES.AUTH} 
      state={{ from: location.pathname }} 
      replace 
    />;
  }

  // Handle missing or invalid profile - wait a bit before redirecting to prevent flashing
  if (!profile) {
    if (showUnauthorizedToast && !hasShownToastRef.current) {
      hasShownToastRef.current = true;
      toast({
        title: "Profile Error",
        description: "Unable to load your profile. Please try signing in again.",
        variant: "destructive"
      });
    }
    return <Navigate to={ROUTES.AUTH} replace />;
  }

  // Check role authorization - also allow SUPER_ADMIN implicitly where ADMIN is allowed
  const effectiveAllowedRoles = allowedRoles.includes('ADMIN' as const) 
    ? [...allowedRoles, 'SUPER_ADMIN' as const] 
    : allowedRoles;
    
  if (!effectiveAllowedRoles.includes(profile.role)) {
    if (showUnauthorizedToast && !hasShownToastRef.current) {
      hasShownToastRef.current = true;
      const roleText = profile.role.toLowerCase();
      toast({
        title: "Access Denied",
        description: `This page requires different permissions than your ${roleText} account provides.`,
        variant: "destructive"
      });
    }

    // Determine where to redirect
    let redirectPath: string;
    
    if (fallbackPath) {
      redirectPath = fallbackPath;
    } else if (redirectToDashboard) {
      redirectPath = getDashboardRoute(profile.role);
    } else {
      redirectPath = ROUTES.HOME;
    }

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default EnhancedRoleGuard;