import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import FeatureItem from "@/components/ui/feature-item";
import StatsCard from "@/components/ui/stats-card";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { 
  Trophy, 
  Target, 
  Users, 
  TrendingUp, 
  Shield, 
  Video, 
  CheckCircle,
  Play,
  Handshake,
  BarChart3,
  Calendar,
  Star
} from "lucide-react";
import { useState } from "react";

const HomeNew = () => {
  const [activeAudience, setActiveAudience] = useState<'players' | 'clubs'>('players');

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Audience Toggle */}
        <Section spacing="none" className="py-4 bg-background border-b border-border">
          <Container>
            <div className="flex justify-center">
              <div className="inline-flex bg-muted rounded-full p-1 gap-1">
                <button
                  onClick={() => setActiveAudience('players')}
                  className={`px-8 py-3 rounded-full font-medium transition-all duration-200 ${
                    activeAudience === 'players'
                      ? 'bg-gradient-lime text-secondary-foreground shadow-soft'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  For Players
                </button>
                <button
                  onClick={() => setActiveAudience('clubs')}
                  className={`px-8 py-3 rounded-full font-medium transition-all duration-200 ${
                    activeAudience === 'clubs'
                      ? 'bg-gradient-blue text-white shadow-soft'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  For Clubs
                </button>
              </div>
            </div>
          </Container>
        </Section>

        {/* Hero Section */}
        <Section spacing="xl" className="bg-gradient-hero text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/20"></div>
          <Container className="relative z-10">
            <div className="text-center max-w-4xl mx-auto animate-fade-in">
              {activeAudience === 'players' ? (
                <>
                  <h1 className="text-display font-bold mb-6">
                    One Shot. One Chance.<br />
                    <span className="text-secondary">Become a Legend.</span>
                  </h1>
                  <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                    Take on the ultimate golf challenge. Hole-in-one competitions with real prizes,
                    professional verification, and the thrill of a lifetime. Your moment of glory awaits.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button 
                      size="lg" 
                      className="bg-secondary hover:bg-secondary-light text-secondary-foreground rounded-full px-8 py-4 text-lg font-semibold shadow-strong"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Play Now
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 py-4 text-lg"
                    >
                      Watch Demo
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-display font-bold mb-6">
                    Turn Every Round Into<br />
                    <span className="text-secondary">Revenue.</span>
                  </h1>
                  <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                    Boost member engagement and generate new income streams with premium 
                    hole-in-one competitions. Complete analytics, automated management, guaranteed payouts.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button 
                      size="lg" 
                      className="bg-secondary hover:bg-secondary-light text-secondary-foreground rounded-full px-8 py-4 text-lg font-semibold shadow-strong"
                    >
                      <Handshake className="w-5 h-5 mr-2" />
                      Partner With Us
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 py-4 text-lg"
                    >
                      View Revenue Report
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Container>
        </Section>

        {/* Trust Banner */}
        <Section spacing="md" className="bg-card">
          <Container>
            <div className="bg-secondary/10 border border-secondary/20 rounded-4xl p-6">
              <div className="flex items-center justify-center gap-8 text-sm font-medium text-secondary-foreground flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/20 rounded-xl">
                    <Shield className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="font-semibold">Insurer-backed</span>
                </div>
                
                <div className="h-6 w-px bg-secondary/30 hidden sm:block"></div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/20 rounded-xl">
                    <Video className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="font-semibold">Verified by 4K CCTV</span>
                </div>
                
                <div className="h-6 w-px bg-secondary/30 hidden sm:block"></div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/20 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="font-semibold">Guaranteed payout</span>
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* Stats Section */}
        <Section spacing="lg" className="bg-muted">
          <Container>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatsCard
                title="Active Competitions"
                value="47"
                description="Live challenges"
                icon={Target}
                className="animate-hover-lift"
              />
              <StatsCard
                title="Total Prize Pool"
                value="£284K"
                description="Available to win"
                icon={Trophy}
                trend={{ value: 23, isPositive: true }}
                className="animate-hover-lift"
              />
              <StatsCard
                title="Success Rate"
                value="0.3%"
                description="Hole-in-one achievers"
                icon={Star}
                className="animate-hover-lift"
              />
              <StatsCard
                title="Partner Clubs"
                value="156"
                description="Premium venues"
                icon={Users}
                trend={{ value: 18, isPositive: true }}
                className="animate-hover-lift"
              />
            </div>
          </Container>
        </Section>

        {/* How It Works */}
        <Section spacing="xl">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-h2 font-bold text-foreground mb-4">
                {activeAudience === 'players' ? 'How to Play' : 'How It Works'}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {activeAudience === 'players' 
                  ? 'Three simple steps to your moment of golfing glory'
                  : 'Seamless integration that drives revenue and engagement'
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {activeAudience === 'players' ? (
                <>
                  <FeatureItem
                    variant="card"
                    icon={Target}
                    title="1. Choose Your Challenge"
                    description="Browse premium hole-in-one competitions at top golf clubs. Each challenge verified and insured."
                    className="animate-hover-lift"
                  />
                  <FeatureItem
                    variant="card"
                    icon={Play}
                    title="2. Take Your Shot"
                    description="Step up to the tee with professional 4K CCTV verification. One shot to change everything."
                    className="animate-hover-lift"
                  />
                  <FeatureItem
                    variant="card"
                    icon={Trophy}
                    title="3. Claim Your Prize"
                    description="Instant verification, guaranteed payout. Your hole-in-one becomes legendary with proof and rewards."
                    className="animate-hover-lift"
                  />
                </>
              ) : (
                <>
                  <FeatureItem
                    variant="card"
                    icon={Handshake}
                    title="1. Partner Setup"
                    description="Quick onboarding with custom hole configurations, pricing, and payout structures tailored to your club."
                    className="animate-hover-lift"
                  />
                  <FeatureItem
                    variant="card"
                    icon={BarChart3}
                    title="2. Drive Engagement"
                    description="Automated competition management with real-time analytics. Track revenue, participation, and member engagement."
                    className="animate-hover-lift"
                  />
                  <FeatureItem
                    variant="card"
                    icon={TrendingUp}
                    title="3. Generate Revenue"
                    description="New income streams from entry fees, increased rounds, and premium experiences. Detailed reporting included."
                    className="animate-hover-lift"
                  />
                </>
              )}
            </div>
          </Container>
        </Section>

        {/* Benefits Section */}
        <Section spacing="xl" className="bg-muted">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-h2 font-bold text-foreground mb-4">
                {activeAudience === 'players' ? 'Why Play With Us?' : 'Why Partner With Us?'}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {activeAudience === 'players' 
                  ? 'The ultimate golf experience with professional standards and real rewards'
                  : 'Proven results for golf clubs looking to innovate and grow revenue'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {activeAudience === 'players' ? (
                <>
                  <Card className="p-6 animate-hover-lift">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-lime rounded-2xl w-fit mx-auto mb-4">
                        <Trophy className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <h3 className="font-semibold mb-2">Real Prizes</h3>
                      <p className="text-small text-muted-foreground">Cash prizes from £100 to £50,000+ with guaranteed payouts</p>
                    </div>
                  </Card>
                  <Card className="p-6 animate-hover-lift">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-blue rounded-2xl w-fit mx-auto mb-4">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">Pro Verification</h3>
                      <p className="text-small text-muted-foreground">4K CCTV coverage ensures every shot is captured and verified</p>
                    </div>
                  </Card>
                  <Card className="p-6 animate-hover-lift">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-lime rounded-2xl w-fit mx-auto mb-4">
                        <Shield className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <h3 className="font-semibold mb-2">Fully Insured</h3>
                      <p className="text-small text-muted-foreground">Every competition backed by professional insurance</p>
                    </div>
                  </Card>
                  <Card className="p-6 animate-hover-lift">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-blue rounded-2xl w-fit mx-auto mb-4">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">Premium Venues</h3>
                      <p className="text-small text-muted-foreground">Play at top-tier golf clubs with championship holes</p>
                    </div>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="p-6 animate-hover-lift">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-lime rounded-2xl w-fit mx-auto mb-4">
                        <TrendingUp className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <h3 className="font-semibold mb-2">Revenue Growth</h3>
                      <p className="text-small text-muted-foreground">Average 15% increase in round bookings and new revenue streams</p>
                    </div>
                  </Card>
                  <Card className="p-6 animate-hover-lift">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-blue rounded-2xl w-fit mx-auto mb-4">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">Complete Analytics</h3>
                      <p className="text-small text-muted-foreground">Detailed reporting on participation, revenue, and member engagement</p>
                    </div>
                  </Card>
                  <Card className="p-6 animate-hover-lift">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-lime rounded-2xl w-fit mx-auto mb-4">
                        <Users className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <h3 className="font-semibold mb-2">Member Engagement</h3>
                      <p className="text-small text-muted-foreground">Increased member activity and retention through exciting challenges</p>
                    </div>
                  </Card>
                  <Card className="p-6 animate-hover-lift">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-blue rounded-2xl w-fit mx-auto mb-4">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">Easy Management</h3>
                      <p className="text-small text-muted-foreground">Automated setup, management, and payout processing</p>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </Container>
        </Section>

        {/* Testimonials / Social Proof */}
        <Section spacing="xl">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-h2 font-bold text-foreground mb-4">
                {activeAudience === 'players' ? 'Success Stories' : 'Partner Success'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {activeAudience === 'players' ? (
                <>
                  <Card className="p-8 animate-hover-lift">
                    <div className="text-center">
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-secondary fill-current" />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-4 italic">
                        "Incredible experience! The verification was flawless and the payout was instant. 
                        My hole-in-one is now legendary."
                      </p>
                      <div className="font-semibold">Sarah Johnson</div>
                      <div className="text-small text-muted-foreground">£2,500 Winner</div>
                    </div>
                  </Card>
                  <Card className="p-8 animate-hover-lift">
                    <div className="text-center">
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-secondary fill-current" />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-4 italic">
                        "The quality of venues and professional setup made this an unforgettable experience. 
                        Worth every penny."
                      </p>
                      <div className="font-semibold">Michael Chen</div>
                      <div className="text-small text-muted-foreground">Regular Player</div>
                    </div>
                  </Card>
                  <Card className="p-8 animate-hover-lift">
                    <div className="text-center">
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-secondary fill-current" />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-4 italic">
                        "Finally hit my hole-in-one and had it properly verified! The £10K prize was 
                        life-changing."
                      </p>
                      <div className="font-semibold">David Williams</div>
                      <div className="text-small text-muted-foreground">£10,000 Winner</div>
                    </div>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="p-8 animate-hover-lift">
                    <div>
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-secondary fill-current" />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-4 italic">
                        "Our revenue increased by 23% in the first quarter. Members love the excitement 
                        and we've seen increased round bookings."
                      </p>
                      <div className="font-semibold">James Morrison</div>
                      <div className="text-small text-muted-foreground">Club Manager, Wentworth Golf Club</div>
                    </div>
                  </Card>
                  <Card className="p-8 animate-hover-lift">
                    <div>
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-secondary fill-current" />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-4 italic">
                        "The analytics dashboard gives us incredible insights. Member engagement has never been higher."
                      </p>
                      <div className="font-semibold">Emma Thompson</div>
                      <div className="text-small text-muted-foreground">Operations Director, Royal Windsor</div>
                    </div>
                  </Card>
                  <Card className="p-8 animate-hover-lift">
                    <div>
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-secondary fill-current" />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-4 italic">
                        "Setup was seamless and the automated management saves us countless hours. 
                        Highly recommend."
                      </p>
                      <div className="font-semibold">Robert Clarke</div>
                      <div className="text-small text-muted-foreground">Head Pro, St. Andrews Links</div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </Container>
        </Section>

        {/* Final CTA */}
        <Section spacing="xl" className="bg-gradient-hero text-white">
          <Container>
            <div className="text-center max-w-3xl mx-auto">
              {activeAudience === 'players' ? (
                <>
                  <h2 className="text-h2 font-bold mb-6">
                    Ready for Your<br />
                    <span className="text-secondary">Moment of Glory?</span>
                  </h2>
                  <p className="text-lg text-white/90 mb-8">
                    Join thousands of golfers taking on the ultimate challenge. 
                    Your hole-in-one could be worth thousands.
                  </p>
                  <Button 
                    size="lg" 
                    className="bg-secondary hover:bg-secondary-light text-secondary-foreground rounded-full px-12 py-4 text-lg font-semibold shadow-strong"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Playing Today
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-h2 font-bold mb-6">
                    Ready to Boost Your<br />
                    <span className="text-secondary">Club Revenue?</span>
                  </h2>
                  <p className="text-lg text-white/90 mb-8">
                    Join 150+ premium golf clubs already generating new revenue 
                    and engaging members with exciting challenges.
                  </p>
                  <Button 
                    size="lg" 
                    className="bg-secondary hover:bg-secondary-light text-secondary-foreground rounded-full px-12 py-4 text-lg font-semibold shadow-strong"
                  >
                    <Handshake className="w-5 h-5 mr-2" />
                    Become a Partner
                  </Button>
                </>
              )}
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default HomeNew;