import { Link } from "react-router-dom";
import Container from "./Container";
import { Trophy, Instagram, Linkedin, Music } from "lucide-react";

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
    { name: "Club Sign Up", href: "/partnership" },
  ];

  return (
    <footer className="bg-muted border-t border-border">
      <Container size="xl">
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center mb-4">
                <img 
                  src="/brand/ohio-logo-black.svg" 
                  alt="OHIO Golf" 
                  className="h-8 w-auto"
                />
              </Link>
              <p className="text-muted-foreground max-w-md">
                Premium golf experiences designed to elevate your game and create unforgettable 
                moments on the course.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-calder font-semibold text-foreground mb-4">Quick Links</h3>
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
              <h3 className="font-calder font-semibold text-foreground mb-4">Legal</h3>
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
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © {currentYear} OHIO Golf. All rights reserved.
              </p>
              {/* Social Media Links */}
              <div className="flex items-center gap-4">
                <a
                  href="https://instagram.com/officialholein1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="https://linkedin.com/company/official-hole-in-1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Follow us on LinkedIn"
                >
                  <Linkedin size={20} />
                </a>
                <a
                  href="https://tiktok.com/@officialholein1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Follow us on TikTok"
                >
                  <Music size={20} />
                </a>
              </div>
            </div>
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