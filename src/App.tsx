import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import ClubSignup from "./pages/ClubSignup";
import PlayerLogin from "./pages/PlayerLogin";
import PlayerEntries from "./pages/PlayerEntries";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import CompetitionEntry from "./pages/CompetitionEntry";
import EntryPageNew from "./pages/EntryPageNew";
import EntryConfirmation from "./pages/EntryConfirmation";
import DeveloperDemo from "./pages/DeveloperDemo";
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
import CompetitionWizardPage from "./pages/CompetitionWizardPage";
import Styleguide from "./pages/Styleguide";
import ErrorPage from "./pages/ErrorPage";
import PartnershipApplication from "./pages/PartnershipApplication";

// Auth components
import RoleGuard from "./components/auth/RoleGuard";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/partnership" element={<PartnershipApplication />} />
          <Route path="/clubs/signup" element={<ClubSignup />} />
          <Route path="/players/login" element={<PlayerLogin />} />
          <Route 
            path="/players/entries" 
            element={
              <RoleGuard allowedRoles={['PLAYER']}>
                <PlayerEntries />
              </RoleGuard>
            } 
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dev/demo" element={<DeveloperDemo />} />
          {/* Single route handles both legacy (numeric) and new (slug) formats */}
          <Route path="/enter/:venueSlug/:param" element={<EntryPageNew />} />
          <Route path="/entry/:entryId/confirmation" element={<EntryConfirmation />} />
          <Route path="/enter/:competitionId" element={<CompetitionEntry />} />
          <Route path="/competitions/:id" element={<CompetitionDetail />} />
          
          {/* Dashboard Routes */}
          <Route 
            path="/dashboard/admin" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/players" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <PlayersPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/clubs" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <ClubsPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/competitions" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <CompetitionsPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/competitions/new" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <CompetitionWizardPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/competitions/:id" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <CompetitionDetailEnhanced />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/competitions/:id/edit" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <CompetitionEditPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/revenue" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <RevenuePage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/clubs/:clubId" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <ClubDetailPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/players/:playerId" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <PlayerDetailPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/users" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <UserManagement />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/revenue/breakdown" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <RevenueBreakdown />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/entries" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <EntriesPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/admin/claims" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <ClaimsPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club" 
            element={
              <RoleGuard allowedRoles={['CLUB']}>
                <ClubDashboardNew />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/revenue" 
            element={
              <RoleGuard allowedRoles={['CLUB']}>
                <ClubRevenue />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/entries" 
            element={
              <RoleGuard allowedRoles={['CLUB']}>
                <ClubEntries />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/competitions" 
            element={
              <RoleGuard allowedRoles={['CLUB']}>
                <ClubCompetitions />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/support" 
            element={
              <RoleGuard allowedRoles={['CLUB']}>
                <ClubSupport />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/competitions/new" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <CompetitionWizardPage />
              </RoleGuard>
            } 
          />
          <Route 
            path="/dashboard/club/competitions/:id" 
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <CompetitionDetailEnhanced />
              </RoleGuard>
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

export default App;
