import { useState } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import AudienceSelector from "@/components/home/AudienceSelector";
import ClubPartnerSection from "@/components/home/ClubPartnerSection";
import PlayerExcitementSection from "@/components/home/PlayerExcitementSection";

const Home = () => {
  const [selectedAudience, setSelectedAudience] = useState<'clubs' | 'players'>('clubs');

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main>
        <ClubPartnerSection />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Home;