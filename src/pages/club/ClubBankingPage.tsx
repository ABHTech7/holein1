import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import ClubBankingSection from "@/components/club/ClubBankingSection";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/routes";

const ClubBankingPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Redirect if not a club user
  useEffect(() => {
    if (profile?.role !== 'CLUB' || !profile?.club_id) {
      navigate(ROUTES.CLUB.DASHBOARD);
    }
  }, [profile, navigate]);

  // Show loading while profile is being determined
  if (!profile) {
    return null;
  }

  // Don't render if not authorized
  if (profile.role !== 'CLUB' || !profile.club_id) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate(ROUTES.CLUB.DASHBOARD)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Banking Details</h1>
              <p className="text-muted-foreground mt-2">
                Manage your club's banking information for payouts and financial transactions.
              </p>
            </div>

            <ClubBankingSection clubId={profile.club_id} />
          </div>
        </div>
      </Section>
    </div>
  );
};

export default ClubBankingPage;