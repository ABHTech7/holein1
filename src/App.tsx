import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import ClubSignup from "./pages/ClubSignup";
import PlayerLogin from "./pages/PlayerLogin";
import CompetitionEntry from "./pages/CompetitionEntry";
import AdminDashboard from "./pages/AdminDashboard";
import ClubDashboard from "./pages/ClubDashboard";
import Styleguide from "./pages/Styleguide";
import ErrorPage from "./pages/ErrorPage";

// Policy Pages
import PrivacyPolicy from "./pages/policies/PrivacyPolicy";
import TermsOfService from "./pages/policies/TermsOfService";
import CookiePolicy from "./pages/policies/CookiePolicy";
import Insurance from "./pages/policies/Insurance";
import Accessibility from "./pages/policies/Accessibility";

// Legacy pages for compatibility
import Index from "./pages/Index";
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
          <Route path="/clubs/signup" element={<ClubSignup />} />
          <Route path="/players/login" element={<PlayerLogin />} />
          <Route path="/enter/:competitionId" element={<CompetitionEntry />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/dashboard/club" element={<ClubDashboard />} />
          
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
