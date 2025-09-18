import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import StatsCard from "@/components/ui/stats-card";
import FeatureItem from "@/components/ui/feature-item";
import EmptyState from "@/components/ui/empty-state";
import ChartWrapper from "@/components/ui/chart-wrapper";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { Trophy, Users, Calendar, Star, Info, AlertCircle, CheckCircle, Target } from "lucide-react";

const StyleguideNew = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Page Header */}
        <Section spacing="lg" className="bg-muted">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-sm border border-secondary/30 rounded-full px-6 py-2 mb-6">
            <span className="text-secondary font-bold text-sm tracking-wide">OFFICIAL HOLE IN 1</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Blue/Lime Design System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive overview of the enhanced blue and lime design system with modern styling, 
            glass morphism effects, and elevated interactions.
          </p>
        </div>
        </Section>

        {/* Colors */}
        <Section spacing="lg">
          <h2 className="text-h2 font-bold text-foreground mb-8">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="animate-hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-primary rounded-2xl mb-4 shadow-soft"></div>
                <h3 className="font-semibold">Primary Blue</h3>
                <p className="text-small text-muted-foreground">#2F7BFF</p>
                <div className="mt-2 text-xs bg-muted px-2 py-1 rounded-full">
                  hsl(217 91% 60%)
                </div>
              </CardContent>
            </Card>
            <Card className="animate-hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-secondary rounded-2xl mb-4 shadow-soft"></div>
                <h3 className="font-semibold">Lime Accent</h3>
                <p className="text-small text-muted-foreground">#C5FF3E</p>
                <div className="mt-2 text-xs bg-muted px-2 py-1 rounded-full">
                  hsl(81 100% 62%)
                </div>
              </CardContent>
            </Card>
            <Card className="animate-hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-primary-light rounded-2xl mb-4 shadow-soft"></div>
                <h3 className="font-semibold">Light Blue</h3>
                <p className="text-small text-muted-foreground">#A0CDEE</p>
                <div className="mt-2 text-xs bg-muted px-2 py-1 rounded-full">
                  hsl(203 74% 77%)
                </div>
              </CardContent>
            </Card>
            <Card className="animate-hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-muted rounded-2xl mb-4 shadow-soft"></div>
                <h3 className="font-semibold">Muted Blue</h3>
                <p className="text-small text-muted-foreground">#EAF1FF</p>
                <div className="mt-2 text-xs bg-muted px-2 py-1 rounded-full">
                  hsl(214 100% 94%)
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Gradients */}
        <Section spacing="lg" className="bg-muted">
          <h2 className="text-h2 font-bold text-foreground mb-8">Gradients</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="animate-hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-gradient-primary rounded-2xl mb-4 shadow-soft"></div>
                <h3 className="font-semibold">Primary Gradient</h3>
                <p className="text-small text-muted-foreground">Light to dark blue</p>
              </CardContent>
            </Card>
            <Card className="animate-hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-gradient-lime rounded-2xl mb-4 shadow-soft"></div>
                <h3 className="font-semibold">Lime Gradient</h3>
                <p className="text-small text-muted-foreground">Bright to light lime</p>
              </CardContent>
            </Card>
            <Card className="animate-hover-lift">
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-gradient-hero rounded-2xl mb-4 shadow-soft"></div>
                <h3 className="font-semibold">Hero Gradient</h3>
                <p className="text-small text-muted-foreground">Blue to lime blend</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Typography */}
        <Section spacing="lg">
          <h2 className="text-h2 font-bold text-foreground mb-8">Typography</h2>
          <div className="space-y-6">
            <div>
              <h1 className="text-display font-bold text-foreground">Display Heading (56px) - Inter Bold</h1>
              <h2 className="text-h2 font-bold text-foreground">Heading 2 (32px) - Inter Bold</h2>
              <h3 className="text-2xl font-semibold text-foreground">Heading 3 (24px) - Inter Semibold</h3>
              <h4 className="text-xl font-semibold text-foreground">Heading 4 (20px) - Inter Semibold</h4>
            </div>
            <div>
              <p className="text-lg text-foreground">Large body text (18px) - Inter Regular</p>
              <p className="text-body text-foreground">Regular body text (16px) - Inter Regular</p>
              <p className="text-small text-muted-foreground">Small text (14px) - Inter Regular</p>
              <p className="text-xs text-muted-foreground">Extra small text (12px) - Inter Regular</p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section spacing="lg" className="bg-muted">
          <h2 className="text-h2 font-bold text-foreground mb-8">Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Primary Buttons</h3>
              <div className="space-y-3">
                <Button size="lg" className="w-full bg-gradient-blue">Large Primary</Button>
                <Button className="w-full">Default Primary</Button>
                <Button size="sm" className="w-full">Small Primary</Button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Secondary (Lime)</h3>
              <div className="space-y-3">
                <Button variant="secondary" size="lg" className="w-full">Large Lime</Button>
                <Button variant="secondary" className="w-full">Default Lime</Button>
                <Button variant="secondary" size="sm" className="w-full">Small Lime</Button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Pill Buttons</h3>
              <div className="space-y-3">
                <Button size="lg" className="w-full bg-gradient-lime rounded-full">Pill Large</Button>
                <Button className="w-full rounded-full">Pill Default</Button>
                <Button size="sm" className="w-full rounded-full">Pill Small</Button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Outline Buttons</h3>
              <div className="space-y-3">
                <Button variant="outline" size="lg" className="w-full">Large Outline</Button>
                <Button variant="outline" className="w-full">Default Outline</Button>
                <Button variant="outline" size="sm" className="w-full">Small Outline</Button>
              </div>
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section spacing="lg">
          <h2 className="text-h2 font-bold text-foreground mb-8">Cards & Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="animate-hover-lift">
              <CardHeader>
                <CardTitle>Simple Card</CardTitle>
                <CardDescription>
                  A basic card component with 32px border radius and soft shadows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-small text-muted-foreground">
                  Enhanced with hover animations and improved spacing for better user experience.
                </p>
              </CardContent>
            </Card>

            <StatsCard
              title="Stats Card"
              value="1,234"
              description="With hover lift effect"
              icon={Trophy}
              trend={{ value: 15, isPositive: true }}
              className="animate-hover-lift"
            />

            <Card className="shadow-medium animate-hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-lime text-secondary-foreground">JD</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">John Doe</h4>
                    <p className="text-small text-muted-foreground">Golf Pro</p>
                  </div>
                </div>
                <p className="text-small">Enhanced card with gradient avatar background and improved typography.</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Feature Items */}
        <Section spacing="lg" className="bg-muted">
          <h2 className="text-h2 font-bold text-foreground mb-8">Feature Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureItem
              variant="card"
              icon={Users}
              title="Enhanced Card Style"
              description="Feature items with improved hover effects, gradient icons, and better spacing for modern appeal."
              className="animate-hover-lift"
            />
            <FeatureItem
              variant="default"
              icon={Calendar}
              title="Standard Variant"
              description="Clean design with soft shadows and rounded corners following the new design system."
              className="animate-hover-lift"
            />
            <FeatureItem
              variant="minimal"
              icon={Trophy}
              title="Minimal Style"
              description="Simplified layout perfect for sidebar content or dense information displays."
              className="animate-hover-lift"
            />
          </div>
        </Section>

        {/* Form Elements */}
        <Section spacing="lg">
          <h2 className="text-h2 font-bold text-foreground mb-8">Form Elements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="animate-hover-lift">
              <CardHeader>
                <CardTitle>Sample Form</CardTitle>
                <CardDescription>Enhanced form styling with lime focus rings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="Enter your email" className="rounded-2xl" />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter your name" className="rounded-2xl" />
                </div>
                <Button className="w-full bg-gradient-lime text-secondary-foreground rounded-full">
                  Submit Form
                </Button>
              </CardContent>
            </Card>

            <Card className="animate-hover-lift">
              <CardHeader>
                <CardTitle>Interactive Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-gradient-blue text-white">Primary Badge</Badge>
                  <Badge variant="secondary">Lime Badge</Badge>
                  <Badge variant="outline">Outline Badge</Badge>
                </div>
                
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary">
                    This is an enhanced info alert with blue theming.
                  </AlertDescription>
                </Alert>
                
                <Alert className="border-secondary/20 bg-secondary/5">
                  <CheckCircle className="h-4 w-4 text-secondary-foreground" />
                  <AlertDescription className="text-secondary-foreground">
                    This is a success alert with lime accent styling.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Chips & Pills */}
        <Section spacing="lg" className="bg-muted">
          <h2 className="text-h2 font-bold text-foreground mb-8">Pills & Chips</h2>
          <div className="flex flex-wrap gap-4">
            <div className="px-4 py-2 bg-gradient-blue text-white rounded-full shadow-soft">
              Primary Pill
            </div>
            <div className="px-4 py-2 bg-gradient-lime text-secondary-foreground rounded-full shadow-soft">
              Lime Pill
            </div>
            <div className="px-4 py-2 bg-card border border-border rounded-full shadow-soft">
              Neutral Pill
            </div>
            <div className="px-4 py-2 bg-muted border border-primary rounded-full text-primary">
              Outline Pill
            </div>
          </div>
        </Section>

        {/* Empty States */}
        <Section spacing="lg">
          <h2 className="text-h2 font-bold text-foreground mb-8">Empty States</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="animate-hover-lift">
              <EmptyState
                size="sm"
                icon={Users}
                title="No Players"
                description="No players found for this competition."
                action={{
                  label: "Add Player",
                  onClick: () => console.log("Add player clicked")
                }}
              />
            </Card>
            <Card className="animate-hover-lift">
              <EmptyState
                size="md"
                icon={Calendar}
                title="No Events"
                description="No upcoming golf events scheduled at this time."
              />
            </Card>
            <Card className="animate-hover-lift">
              <EmptyState
                size="lg"
                icon={Trophy}
                title="No Competitions"
                description="No active hole-in-one competitions available right now."
              />
            </Card>
          </div>
        </Section>

        {/* Shadows & Effects */}
        <Section spacing="lg" className="bg-muted">
          <h2 className="text-h2 font-bold text-foreground mb-8">Shadows & Effects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-soft">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Soft Shadow</h3>
                <p className="text-small text-muted-foreground">Subtle elevation for cards</p>
              </CardContent>
            </Card>
            <Card className="shadow-medium">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Medium Shadow</h3>
                <p className="text-small text-muted-foreground">Standard hover states</p>
              </CardContent>
            </Card>
            <Card className="shadow-strong">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Strong Shadow</h3>
                <p className="text-small text-muted-foreground">High elevation modals</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Hero Section Demo */}
        <Section spacing="xl" className="bg-gradient-hero text-white">
          <Container>
            <div className="text-center max-w-4xl mx-auto animate-fade-in">
              <h1 className="text-display font-bold mb-6">
                Hero Section Demo
              </h1>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                This demonstrates the hero section styling with the gradient background, 
                proper typography scale, and button treatments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  className="bg-secondary hover:bg-secondary-light text-secondary-foreground rounded-full px-8 py-4 text-lg font-semibold shadow-strong"
                >
                  Primary CTA
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 py-4 text-lg"
                >
                  Secondary Action
                </Button>
              </div>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default StyleguideNew;