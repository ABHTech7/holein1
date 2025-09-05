import { Link } from "react-router-dom";
import Container from "./Container";
import { Trophy } from "lucide-react";

const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  const policyLinks = [
    { name: "Privacy Policy", href: "/policies/privacy" },
    { name: "Terms of Service", href: "/policies/terms" },
    { name: "Cookie Policy", href: "/policies/cookies" },
    { name: "Insurance", href: "/policies/insurance" },
    { name: "Accessibility", href: "/policies/accessibility" },
  ];

  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "Club Sign Up", href: "/clubs/signup" },
    { name: "Player Login", href: "/players/login" },
  ];

  return (
    <footer className="bg-muted border-t border-border">
      <Container size="xl">
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-display text-xl font-semibold text-foreground">
                  Hole in 1 Challenge
                </span>
              </Link>
              <p className="text-muted-foreground max-w-md">
                Founded by two lifelong golf enthusiasts, we help clubs create unforgettable 
                hole-in-one experiences that drive prestige, engagement, and new revenue.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-3">
                {policyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Hole in 1 Challenge. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link 
                to="/policies/privacy" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link 
                to="/policies/terms" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Terms
              </Link>
              <Link 
                to="/policies/accessibility" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default SiteFooter;