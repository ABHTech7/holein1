import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import ClubPartnerSection from "@/components/home/ClubPartnerSection";
import PlayerExcitementSection from "@/components/home/PlayerExcitementSection";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main>
        <PlayerExcitementSection />
        <ClubPartnerSection />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Home;