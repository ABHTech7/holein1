import { Link, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

const ErrorPage = () => {
  const error = useRouteError() as any;
  const isNotFound = error?.status === 404;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl" className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-lg shadow-medium">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                  {isNotFound ? "Page Not Found" : "Something Went Wrong"}
                </h1>
                <p className="text-muted-foreground">
                  {isNotFound 
                    ? "The page you're looking for doesn't exist or has been moved."
                    : "We encountered an unexpected error. Please try again or contact support if the problem persists."
                  }
                </p>
              </div>

              {error?.statusText && (
                <div className="mb-6 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-mono text-muted-foreground">
                    Error: {error.statusText}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  asChild
                  className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
                >
                  <Link to="/">
                    <Home className="w-4 h-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>

              {!isNotFound && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Need help? Contact support at{" "}
                    <a 
                      href="mailto:support@holein1.test" 
                      className="text-primary hover:underline"
                    >
                      support@holein1.test
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ErrorPage;