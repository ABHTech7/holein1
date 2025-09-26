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
        {/* Main Hero Section */}
        <section className="relative bg-cover bg-center bg-no-repeat py-24 lg:py-32" style={{backgroundImage: `url(/img/${selectedAudience === 'clubs' ? 'golf-course-2.jpg' : 'golf-course-1.jpg'})`}}>
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative z-10 text-center">
            <h1 className="font-calder text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg flex flex-col items-center gap-4">
              <Container>
                <span>Welcome to</span>
              </Container>
              <img 
                src="/brand/ohio-logo-black.svg" 
                alt="Official Hole in One" 
                className="w-full max-w-4xl mx-auto filter invert px-4"
              />
            </h1>
            <Container>
              <p className="text-lg md:text-xl text-white/95 max-w-3xl mx-auto mb-8 drop-shadow-md">
                Choose your path to discover premium golf experiences
              </p>
            </Container>
            <Container>
              <AudienceSelector 
                selectedAudience={selectedAudience}
                onAudienceChange={setSelectedAudience}
              />
            </Container>
          </div>
        </section>

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