import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Container from "./Container";
import { Trophy, Menu, User, LogOut, BarChart3 } from "lucide-react";
import { useState } from "react";
import useAuth from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SuperAdminProfileModal } from "@/components/admin/SuperAdminProfileModal";
import { ROUTES, getDashboardRoute } from "@/routes";

const SiteHeader = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user, profile, signOut, refreshProfile } = useAuth();

  const navigation = [
    // Only show Home for non-admin/super-admin roles and non-insurance pages
    ...((profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN') || location.pathname.startsWith('/dashboard/insurance') ? [] : [{ name: "Home", href: ROUTES.HOME }]),
  ];

  const authNavigation = user ? [
    ...((profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN') ? [{ name: "Admin", href: ROUTES.ADMIN.DASHBOARD }] : []),
    ...(profile?.role === 'CLUB' ? [{ name: "Dashboard", href: ROUTES.CLUB.DASHBOARD }] : []),
    ...(profile?.role === 'INSURANCE_PARTNER' ? [{ name: "Insurance Dashboard", href: ROUTES.INSURANCE.DASHBOARD }] : []),
  ] : [];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-testid="site-header"
    >
      <Container size="xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            to={ROUTES.HOME} 
            className="flex items-center hover:opacity-80 transition-opacity"
            data-testid="site-logo"
          >
            <img 
              src="/brand/ohio-logo-black.svg" 
              alt="Official Hole in One" 
              className="h-16 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {[...navigation, ...authNavigation].map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted/50",
                  isActive(item.href) 
                    ? "text-primary bg-muted" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu (Desktop) */}
          <div className="hidden md:block">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    {profile?.first_name || user.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {profile?.role === 'SUPER_ADMIN' && (
                    <DropdownMenuItem onClick={() => setShowProfileModal(true)}>
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="default" size="sm">
                <Link to={ROUTES.AUTH}>
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-5 h-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-border/40">
            {[...navigation, ...authNavigation].map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "block px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive(item.href) 
                    ? "text-primary bg-muted" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {user ? (
              <div className="pt-2">
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="pt-2">
                <Button 
                  asChild
                  variant="default"
                  className="w-full"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Link to={ROUTES.AUTH}>
                    <User className="w-4 h-4 mr-2" />
                    Login
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </Container>
      
      {/* Super Admin Profile Modal */}
      {showProfileModal && profile && profile.role === 'SUPER_ADMIN' && (
        <SuperAdminProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentUser={{
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: undefined,
          }}
          onProfileUpdated={() => {
            refreshProfile();
          }}
        />
      )}
    </header>
  );
};

export default SiteHeader;