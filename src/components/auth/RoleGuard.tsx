import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: Array<'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'PLAYER' | 'INSURANCE_PARTNER'>;
  fallbackPath?: string;
}

const RoleGuard = ({ children, allowedRoles, fallbackPath = '/' }: RoleGuardProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;