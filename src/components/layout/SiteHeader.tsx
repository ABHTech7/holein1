import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Container from "./Container";
import { Trophy, Menu, User, LogOut, Building } from "lucide-react";
import { useState, useEffect } from "react";
import useAuth from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

const SiteHeader = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const [clubData, setClubData] = useState<any>(null);

  useEffect(() => {
    const fetchClubData = async () => {
      if (!profile?.club_id || profile?.role !== 'CLUB') return;
      
      try {
        const { data: club, error } = await supabase
          .from('clubs')
          .select('*')
          .eq('id', profile.club_id)
          .single();

        if (error) throw error;
        setClubData(club);
      } catch (error) {
        console.error('Error fetching club data:', error);
      }
    };

    if (profile) {
      fetchClubData();
    }
  }, [profile]);

  const navigation = [
    // Only show Home on non-admin pages
    ...(location.pathname.startsWith('/dashboard/admin') ? [] : [{ name: "Home", href: "/" }]),
  ];

  const authNavigation = user ? [
    ...(profile?.role === 'ADMIN' ? [{ name: "Admin", href: "/dashboard/admin" }] : []),
    ...(profile?.role === 'CLUB' ? [{ name: "Dashboard", href: "/dashboard/club" }] : []),
  ] : [
    { name: "Sign Up", href: "/auth" },
    { name: "Login", href: "/auth" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container size="xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">
              Hole in 1 Challenge
            </span>
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

          {/* User Menu or CTA Button (Desktop) */}
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
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                asChild
                variant="default"
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium"
              >
                <Link to="/auth">Get Started</Link>
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
            <div className="pt-2">
              {user ? (
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
              ) : (
                <Button 
                  asChild
                  variant="default"
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium"
                >
                  <Link to="/auth">Get Started</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Container>
    </header>
  );
};

export default SiteHeader;