import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";

const Insurance = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl">
          <Container size="md">
            <div className="prose prose-lg max-w-none">
              <h1 className="font-display text-4xl font-bold text-foreground mb-8">Insurance Policy</h1>
              <p className="text-muted-foreground mb-8">Last updated: August 2024</p>
              
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Coverage Overview</h2>
                  <p className="text-foreground mb-4">
                    Hole in 1 Challenge maintains comprehensive insurance coverage to protect our platform, 
                    users, and club data. This policy outlines our insurance commitments and coverage areas.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Platform Protection</h2>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Cyber liability insurance for data breaches</li>
                    <li>Professional indemnity coverage</li>
                    <li>Technology errors and omissions insurance</li>
                    <li>General liability protection</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Data Security</h2>
                  <p className="text-foreground mb-4">
                    Our insurance coverage includes comprehensive data protection measures:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Data breach response and notification costs</li>
                    <li>Credit monitoring services for affected users</li>
                    <li>Legal and regulatory defense costs</li>
                    <li>Business interruption coverage</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Club Recommendations</h2>
                  <p className="text-foreground mb-4">
                    We recommend that clubs maintain their own insurance coverage for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Public liability for club activities</li>
                    <li>Property insurance for facilities</li>
                    <li>Equipment and asset protection</li>
                    <li>Event-specific coverage</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Claims Process</h2>
                  <p className="text-foreground mb-4">
                    In the event of an incident covered by our insurance policy, 
                    we will handle claims promptly and transparently.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Contact</h2>
                  <p className="text-foreground">
                    For insurance-related questions, contact us at insurance@holein1.test 
                    or through our support channels.
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

export default Insurance;