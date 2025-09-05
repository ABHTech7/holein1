import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl">
          <Container size="md">
            <div className="prose prose-lg max-w-none">
              <h1 className="font-display text-4xl font-bold text-foreground mb-8">Cookie Policy</h1>
              <p className="text-muted-foreground mb-8">Last updated: August 2024</p>
              
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">What Are Cookies</h2>
                  <p className="text-foreground mb-4">
                    Cookies are small text files that are placed on your computer or mobile device 
                    when you visit our website. They help us provide you with a better experience.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">How We Use Cookies</h2>
                  <p className="text-foreground mb-4">
                    We use cookies for several purposes:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Essential cookies for platform functionality</li>
                    <li>Analytics cookies to understand usage patterns</li>
                    <li>Preference cookies to remember your settings</li>
                    <li>Security cookies to protect against fraud</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Types of Cookies We Use</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Strictly Necessary Cookies</h3>
                      <p className="text-foreground">
                        These cookies are essential for the website to function and cannot be switched off.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Performance Cookies</h3>
                      <p className="text-foreground">
                        These cookies collect information about how visitors use our website.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Functional Cookies</h3>
                      <p className="text-foreground">
                        These cookies remember choices you make to improve your experience.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Managing Cookies</h2>
                  <p className="text-foreground mb-4">
                    You can control and manage cookies in various ways. Please note that removing 
                    or blocking cookies can impact your user experience.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
                  <p className="text-foreground">
                    If you have questions about our use of cookies, please contact us at 
                    cookies@holein1.test.
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

export default CookiePolicy;