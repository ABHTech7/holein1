import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Pages
import Home from "./pages/Home";
import ClubSignup from "./pages/ClubSignup";
import PlayerLogin from "./pages/PlayerLogin";
import PlayerDashboardNew from "./pages/player/PlayerDashboardNew";
import PlayerEntries from "./pages/PlayerEntries";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import CompetitionEntry from "./pages/CompetitionEntry";
import EntryPageNew from "./pages/EntryPageNew";
import PlayerJourneyEntryPage from "./pages/PlayerJourneyEntryPage";
import EntryConfirmation from "./pages/EntryConfirmation";
import EntrySuccess from "./pages/EntrySuccess";
import WinClaimPage from "./pages/WinClaimPage";
import WinClaimSuccessPage from "./pages/WinClaimSuccessPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import WinClaimPageNew from "./pages/WinClaimPageNew";


import AdminDashboard from "./pages/AdminDashboard";
import ClubDashboard from "./pages/ClubDashboard";
import ClubDashboardNew from "./pages/ClubDashboardNew";
import ClubRevenue from "./pages/ClubRevenue";
import ClubEntries from "./pages/ClubEntries";
import ClubSupport from "./pages/ClubSupport";
import PlayersPage from "./pages/admin/PlayersPage";
import ClubsPage from "./pages/admin/ClubsPage";
import CompetitionsPage from "./pages/admin/CompetitionsPage";
import RevenuePage from "./pages/admin/RevenuePage";
import ClubDetailPage from "./pages/admin/ClubDetailPage";
import PlayerDetailPage from "./pages/admin/PlayerDetailPage";
import UserManagement from "./pages/admin/UserManagement";
import RevenueBreakdown from "./pages/admin/RevenueBreakdown";
import CompetitionDetail from "./pages/CompetitionDetail";
import CompetitionDetailEnhanced from "./pages/CompetitionDetailEnhanced";
import CompetitionEditPage from "./pages/admin/CompetitionEditPage";
import EntriesPage from "./pages/admin/EntriesPage";
import ClaimsPage from "./pages/admin/ClaimsPage";
import AdminEnquiries from "./pages/admin/AdminEnquiries";
import ClubClaimsPage from "./pages/club/ClaimsPage";
import ClubBankingPage from "./pages/club/ClubBankingPage";
import ClaimDetailPage from "./pages/admin/ClaimDetailPage";
import CompetitionWizardPage from "./pages/CompetitionWizardPage";
import Styleguide from "./pages/Styleguide";
import ErrorPage from "./pages/ErrorPage";
import PartnershipApplication from "./pages/PartnershipApplication";
import InsuranceDashboard from "./pages/InsuranceDashboard";
import InsuranceEntries from "./pages/InsuranceEntries";
import InsuranceReports from "./pages/InsuranceReports";
import AdminInsuranceManagement from "./pages/admin/AdminInsuranceManagement";

// Auth components
import RoleGuard from "./components/auth/RoleGuard";
import EnhancedRoleGuard from "./components/auth/EnhancedRoleGuard";
import { cleanupExpiredContexts } from "@/lib/entryContext";

// Routes
import { ROUTES } from "./routes";

// Dev components
import DebugHud from "./components/dev/DebugHud";

// Policy Pages
import PrivacyPolicy from "./pages/policies/PrivacyPolicy";
import TermsOfService from "./pages/policies/TermsOfService";
import CookiePolicy from "./pages/policies/CookiePolicy";
import Insurance from "./pages/policies/Insurance";
import Accessibility from "./pages/policies/Accessibility";

// Legacy pages for compatibility
import Index from "./pages/Index";
import ClubCompetitions from "./pages/ClubCompetitions";
import NotFound from "./pages/NotFound";
import CompetitionsBrowse from "./pages/CompetitionsBrowse";
import ExpiredLinkPage from "./pages/ExpiredLinkPage";

const queryClient = new QueryClient();

const App = () => {
  console.log('🔧 App component rendering, current URL:', window.location.href);

  // Dev HUD toggle (press "H" to toggle)
  const [showHud, setShowHud] = useState(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setShowHud(prev => !prev);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Initialize app cleanup and development tools
  useEffect(() => {
    // Clean up expired entry contexts on app load
    cleanupExpiredContexts();
    
    // Development-only RLS probe - disabled to prevent production errors
    // if (process.env.NODE_ENV !== 'production') {
    //   const runProbe = async () => {
    //     const { probeRLS } = await import('@/lib/rlsProbe');
    //     await probeRLS('AppMount');
    //   };
    //   
    //   // Small delay to ensure auth is initialized
    //   const timer = setTimeout(runProbe, 1000);
    //   return () => clearTimeout(timer);
    // }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
       <BrowserRouter>
         {process.env.NODE_ENV === 'development' && showHud && <DebugHud />}
         <Routes>
            {/* Main Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/partnership" element={<PartnershipApplication />} />
            <Route path="/clubs/signup" element={<ClubSignup />} />
            <Route path="/players/login" element={<PlayerLogin />} />
            <Route 
              path="/players/entries" 
              element={
                <EnhancedRoleGuard allowedRoles={['PLAYER']}>
                  <PlayerEntries />
                </EnhancedRoleGuard>
              } 
            />
            <Route 
              path="/player/dashboard" 
              element={
                <EnhancedRoleGuard allowedRoles={['PLAYER']}>
                  <PlayerDashboardNew />
                </EnhancedRoleGuard>
              } 
            />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/expired-link" element={<ExpiredLinkPage />} />
            <Route path="/auth/expired" element={<Navigate to="/auth/expired-link" replace />} />
            <Route path="/competitions" element={<CompetitionsBrowse />} />
            
            {/* New competition entry route with clear structure */}
            <Route 
              path="/competition/:clubSlug/:competitionSlug" 
              element={
                <>
                  {console.log('🎯 Competition route matched!')}
                  <EntryPageNew />
                </>
              } 
            />
            {/* Player Journey V2 entry form route */}
            <Route 
              path="/competition/:clubSlug/:competitionSlug/enter" 
              element={<PlayerJourneyEntryPage />} 
            />
            <Route 
              path="/entry/:entryId/confirmation" 
              element={
                <EnhancedRoleGuard allowedRoles={['ADMIN', 'CLUB', 'PLAYER']} showUnauthorizedToast={false}>
                  <EntryConfirmation />
                </EnhancedRoleGuard>
              } 
            />
            <Route 
              path="/entry-success/:entryId" 
              element={
                <EnhancedRoleGuard allowedRoles={['ADMIN', 'CLUB', 'PLAYER']} showUnauthorizedToast={false}>
                  <EntrySuccess />
                </EnhancedRoleGuard>
              } 
            />
            <Route 
              path="/win-claim/:entryId" 
              element={
                <EnhancedRoleGuard allowedRoles={['ADMIN', 'CLUB', 'PLAYER']} showUnauthorizedToast={false}>
                  <WinClaimPageNew />
                </EnhancedRoleGuard>
              } 
            />
            <Route 
              path="/win-claim-legacy/:entryId" 
              element={
                <EnhancedRoleGuard allowedRoles={['ADMIN', 'CLUB', 'PLAYER']} showUnauthorizedToast={false}>
                  <WinClaimPage />
                </EnhancedRoleGuard>
              } 
            />
            {/* Legacy routes for backward compatibility */}
            <Route path="/enter/:competitionId" element={<CompetitionEntry />} />
            <Route path="/competitions/:id" element={<CompetitionDetail />} />
            
            {/* Dashboard Routes */}
            <Route 
              path="/dashboard/admin" 
              element={
                <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminDashboard />
                </EnhancedRoleGuard>
              } 
            />
          <Route 
            path="/dashboard/admin/players" 
            element={
              <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <PlayersPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/clubs" 
            element={
              <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <ClubsPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/competitions" 
            element={
                <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <CompetitionsPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/competitions/new" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <CompetitionWizardPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/competitions/:id" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <CompetitionDetailEnhanced />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/competitions/:id/edit" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <CompetitionEditPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/claims" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <ClaimsPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/claims" 
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <ClubClaimsPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/claims/:verificationId" 
            element={
              <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLUB']}>
                <ClaimDetailPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/revenue" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <RevenuePage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/clubs/:clubId" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <ClubDetailPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/players/:playerId" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <PlayerDetailPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/users" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <UserManagement />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/revenue/breakdown" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <RevenueBreakdown />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/entries" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <EntriesPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/enquiries" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminEnquiries />
              </EnhancedRoleGuard>
            } 
          />
          
          {/* Insurance Routes */}
          <Route 
            path="/dashboard/admin/insurance" 
            element={
               <EnhancedRoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminInsuranceManagement />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/insurance" 
            element={
               <EnhancedRoleGuard allowedRoles={['INSURANCE_PARTNER']}>
                <InsuranceDashboard />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/insurance/entries" 
            element={
               <EnhancedRoleGuard allowedRoles={['INSURANCE_PARTNER']}>
                <InsuranceEntries />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/insurance/premiums" 
            element={
               <EnhancedRoleGuard allowedRoles={['INSURANCE_PARTNER']}>
                <InsuranceDashboard />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/insurance/reports" 
            element={
               <EnhancedRoleGuard allowedRoles={['INSURANCE_PARTNER']}>
                <InsuranceReports />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path={ROUTES.CLUB.DASHBOARD}
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <ClubDashboardNew />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/revenue" 
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <ClubRevenue />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/entries" 
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <ClubEntries />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path={ROUTES.CLUB.BANKING}
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <ClubBankingPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/competitions" 
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <ClubCompetitions />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/support" 
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <ClubSupport />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path={ROUTES.CLUB.COMPETITIONS_NEW}
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <CompetitionWizardPage />
              </EnhancedRoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/competitions/:id" 
            element={
              <EnhancedRoleGuard allowedRoles={['CLUB']}>
                <CompetitionDetailEnhanced />
              </EnhancedRoleGuard>
            } 
          />
          
          {/* Policy Routes */}
          <Route path="/policies/privacy" element={<PrivacyPolicy />} />
          <Route path="/policies/terms" element={<TermsOfService />} />
          <Route path="/policies/cookies" element={<CookiePolicy />} />
          <Route path="/policies/insurance" element={<Insurance />} />
          <Route path="/policies/accessibility" element={<Accessibility />} />
          
          {/* Development & Documentation */}
          <Route path="/styleguide" element={<Styleguide />} />
          
          {/* Legacy Routes - keeping for compatibility */}
          <Route path="/index" element={<Index />} />
          <Route path="/auth-callback" element={<Navigate to="/auth/callback" replace />} />
          
          {/* Error Routes */}
          <Route path="/404" element={<NotFound />} />
          <Route path="/500" element={<ErrorPage />} />
          
           {/* Catch-all route - must be last */}
           <Route path="*" element={<ErrorPage />} errorElement={<ErrorPage />} />
         </Routes>
       </BrowserRouter>
     </TooltipProvider>
   </QueryClientProvider>
  );
};

export default App;
