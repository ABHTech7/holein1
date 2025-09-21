import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";

const Accessibility = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl">
          <Container size="md">
            <div className="prose prose-lg max-w-none">
              <h1 className="font-display text-4xl font-bold text-foreground mb-8">Accessibility Statement</h1>
              <p className="text-muted-foreground mb-8">Last updated: August 2024</p>
              
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Our Commitment</h2>
                  <p className="text-foreground mb-4">
                    Official Hole in 1 is committed to ensuring digital accessibility for all users, including 
                    those with disabilities. We strive to provide an inclusive experience that works 
                    for everyone.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Accessibility Standards</h2>
                  <p className="text-foreground mb-4">
                    We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA 
                    standards. These guidelines help make web content more accessible to people with 
                    a wide range of disabilities.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Features We've Implemented</h2>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Keyboard navigation support</li>
                    <li>Screen reader compatibility</li>
                    <li>High contrast color options</li>
                    <li>Scalable fonts and responsive design</li>
                    <li>Alternative text for images</li>
                    <li>Clear heading structure and navigation</li>
                    <li>Focus indicators for interactive elements</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Ongoing Efforts</h2>
                  <p className="text-foreground mb-4">
                    We continuously work to improve accessibility:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Regular accessibility audits</li>
                    <li>User testing with assistive technologies</li>
                    <li>Staff training on accessibility best practices</li>
                    <li>Incorporating accessibility in our design process</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Browser and Assistive Technology Support</h2>
                  <p className="text-foreground mb-4">
                    Official Hole in 1 is designed to work with:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Modern web browsers (Chrome, Firefox, Safari, Edge)</li>
                    <li>Screen readers (NVDA, JAWS, VoiceOver)</li>
                    <li>Keyboard navigation</li>
                    <li>Voice recognition software</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Feedback and Support</h2>
                  <p className="text-foreground mb-4">
                    We welcome feedback about the accessibility of Official Hole in 1. If you encounter 
                    accessibility barriers or have suggestions for improvement, please contact us:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Email: accessibility@holein1.test</li>
                    <li>Phone: +1 (555) 123-4567</li>
                    <li>Online support: Available through our help center</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Limitations and Alternatives</h2>
                  <p className="text-foreground mb-4">
                    While we strive for complete accessibility, we acknowledge that some areas may 
                    have limitations. When this occurs, we provide alternative means of access or 
                    assistance. Please contact our support team for help with any accessibility issues.
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

export default Accessibility;