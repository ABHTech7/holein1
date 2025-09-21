import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl">
          <Container size="md">
            <div className="prose prose-lg max-w-none">
              <h1 className="font-display text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
              <p className="text-muted-foreground mb-8">Last updated: August 2024</p>
              
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
                  <p className="text-foreground mb-4">
                    We collect information you provide directly to us, such as when you create an account, 
                    register for events, or contact us for support.
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Personal information (name, email address, phone number)</li>
                    <li>Club and team information</li>
                    <li>Event participation and performance data</li>
                    <li>Communication preferences</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
                  <p className="text-foreground mb-4">
                    We use the information we collect to provide, maintain, and improve our services:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>To provide and operate Official Hole in 1 services</li>
                    <li>To send you service-related communications</li>
                    <li>To improve our platform and develop new features</li>
                    <li>To ensure platform security and prevent fraud</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">3. Information Sharing</h2>
                  <p className="text-foreground mb-4">
                    We do not sell, trade, or otherwise transfer your personal information to third parties 
                    without your consent, except as described in this policy.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">4. Data Security</h2>
                  <p className="text-foreground mb-4">
                    We implement appropriate security measures to protect your personal information 
                    against unauthorized access, alteration, disclosure, or destruction.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">5. Contact Us</h2>
                  <p className="text-foreground">
                    If you have any questions about this Privacy Policy, please contact us at 
                    privacy@holein1.test or through our support system.
                  </p>
                </section>
              </div>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PrivacyPolicy;