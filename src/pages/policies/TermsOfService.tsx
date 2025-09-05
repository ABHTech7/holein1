import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl">
          <Container size="md">
            <div className="prose prose-lg max-w-none">
              <h1 className="font-display text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
              <p className="text-muted-foreground mb-8">Last updated: August 2024</p>
              
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                  <p className="text-foreground mb-4">
                    By accessing and using Hole in 1 Challenge, you accept and agree to be bound by the terms 
                    and provision of this agreement.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">2. Use License</h2>
                  <p className="text-foreground mb-4">
                    Permission is granted to temporarily use Hole in 1 Challenge for personal, non-commercial 
                    transitory viewing only. This is the grant of a license, not a transfer of title.
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Modify or copy the materials</li>
                    <li>Use the materials for commercial purposes or public display</li>
                    <li>Attempt to reverse engineer any software contained on the platform</li>
                    <li>Remove any copyright or proprietary notations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>
                  <p className="text-foreground mb-4">
                    Users are responsible for maintaining the confidentiality of their account 
                    information and for all activities that occur under their account.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">4. Prohibited Uses</h2>
                  <p className="text-foreground mb-4">
                    You may not use Hole in 1 Challenge for any unlawful purpose or to solicit others to 
                    perform unlawful acts.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">5. Limitation of Liability</h2>
                  <p className="text-foreground mb-4">
                    Hole in 1 Challenge shall not be liable for any damages arising from the use or inability 
                    to use the platform.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">6. Contact Information</h2>
                  <p className="text-foreground">
                    If you have any questions about these Terms, please contact us at 
                    legal@holein1.test.
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

export default TermsOfService;