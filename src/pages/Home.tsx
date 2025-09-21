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
        {/* Audience Selection */}
        <Section spacing="lg" className="bg-muted/20">
          <Container>
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                Welcome to Official Hole in 1
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose your path to discover how we're transforming golf experiences
              </p>
            </div>
            <AudienceSelector 
              selectedAudience={selectedAudience}
              onAudienceChange={setSelectedAudience}
            />
          </Container>
        </Section>

        {/* Dynamic Content Based on Selection */}
        {selectedAudience === 'clubs' ? (
          <ClubPartnerSection />
        ) : (
          <PlayerExcitementSection />
        )}
      </main>

      <SiteFooter />
    </div>
  );
};

export default Home;