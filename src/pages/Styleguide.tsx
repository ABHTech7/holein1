import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { Hero, HeroTitle, HeroSubtitle, HeroActions } from "@/components/ui/hero";
import StatsCard from "@/components/ui/stats-card";
import FeatureItem from "@/components/ui/feature-item";
import EmptyState from "@/components/ui/empty-state";
import ChartWrapper from "@/components/ui/chart-wrapper";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { Trophy, Users, Calendar, Star, Info, AlertCircle, CheckCircle } from "lucide-react";

const Styleguide = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Page Header */}
        <Section spacing="lg" background="muted">
          <div className="text-center">
            <h1 className="font-display text-4xl font-bold text-foreground mb-4">
              Official Hole In 1 Style Guide
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A comprehensive overview of all UI components and design system elements 
              used throughout the Official Hole In 1 platform.
            </p>
          </div>
        </Section>

        {/* Colors */}
        <Section spacing="lg">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-primary rounded-lg mb-4"></div>
                <h3 className="font-semibold">Primary</h3>
                <p className="text-sm text-muted-foreground">Deep Forest Green</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-secondary rounded-lg mb-4"></div>
                <h3 className="font-semibold">Secondary</h3>
                <p className="text-sm text-muted-foreground">Elegant Gold</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-muted rounded-lg mb-4"></div>
                <h3 className="font-semibold">Muted</h3>
                <p className="text-sm text-muted-foreground">Light Gray</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-full h-20 bg-destructive rounded-lg mb-4"></div>
                <h3 className="font-semibold">Destructive</h3>
                <p className="text-sm text-muted-foreground">Error Red</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Typography */}
        <Section spacing="lg" background="muted">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Typography</h2>
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-4xl font-bold text-foreground">Heading 1 - Playfair Display</h1>
              <h2 className="font-display text-3xl font-semibold text-foreground">Heading 2 - Playfair Display</h2>
              <h3 className="font-display text-2xl font-semibold text-foreground">Heading 3 - Playfair Display</h3>
              <h4 className="font-display text-xl font-semibold text-foreground">Heading 4 - Playfair Display</h4>
            </div>
            <div>
              <p className="text-lg text-foreground">Large body text - Inter Regular</p>
              <p className="text-base text-foreground">Regular body text - Inter Regular</p>
              <p className="text-sm text-muted-foreground">Small text - Inter Regular</p>
              <p className="text-xs text-muted-foreground">Extra small text - Inter Regular</p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section spacing="lg">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Primary Buttons</h3>
              <div className="space-y-3">
                <Button size="lg" className="w-full bg-gradient-primary">Large Primary</Button>
                <Button className="w-full bg-gradient-primary">Default Primary</Button>
                <Button size="sm" className="w-full bg-gradient-primary">Small Primary</Button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Secondary Buttons</h3>
              <div className="space-y-3">
                <Button variant="secondary" size="lg" className="w-full">Large Secondary</Button>
                <Button variant="secondary" className="w-full">Default Secondary</Button>
                <Button variant="secondary" size="sm" className="w-full">Small Secondary</Button>
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
        <Section spacing="lg" background="muted">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Simple Card</CardTitle>
                <CardDescription>
                  A basic card component with header and content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This is the card content area where you can place any information.
                </p>
              </CardContent>
            </Card>

            <StatsCard
              title="Stats Card"
              value="1,234"
              description="Example metric"
              icon={Trophy}
              trend={{ value: 15, isPositive: true }}
            />

            <Card className="shadow-medium">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">John Doe</h4>
                    <p className="text-sm text-muted-foreground">Club Member</p>
                  </div>
                </div>
                <p className="text-sm">Card with avatar and user information.</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Feature Items */}
        <Section spacing="lg">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Feature Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureItem
              variant="card"
              icon={Users}
              title="Card Variant"
              description="Feature item with full card styling and hover effects."
            />
            <FeatureItem
              variant="default"
              icon={Calendar}
              title="Default Variant"
              description="Standard feature item with subtle background and borders."
            />
            <FeatureItem
              variant="minimal"
              icon={Trophy}
              title="Minimal Variant"
              description="Clean minimal style perfect for sidebar content."
            />
          </div>
        </Section>

        {/* Form Elements */}
        <Section spacing="lg" background="muted">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Form Elements</h2>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Sample Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Enter your name" />
              </div>
              <Button className="w-full bg-gradient-primary">Submit Form</Button>
            </CardContent>
          </Card>
        </Section>

        {/* Badges */}
        <Section spacing="lg">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Badges</h2>
          <div className="flex flex-wrap gap-4">
            <Badge>Default Badge</Badge>
            <Badge variant="secondary">Secondary Badge</Badge>
            <Badge variant="destructive">Destructive Badge</Badge>
            <Badge variant="outline">Outline Badge</Badge>
          </div>
        </Section>

        {/* Alerts */}
        <Section spacing="lg" background="muted">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Alerts</h2>
          <div className="space-y-4 max-w-2xl">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This is an informational alert message.
              </AlertDescription>
            </Alert>
            <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is a destructive alert message.
              </AlertDescription>
            </Alert>
            <Alert className="border-success/50 text-success dark:border-success [&>svg]:text-success">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This is a success alert message.
              </AlertDescription>
            </Alert>
          </div>
        </Section>

        {/* Empty States */}
        <Section spacing="lg">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Empty States</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <EmptyState
                size="sm"
                icon={Users}
                title="No Members"
                description="No members found in this category."
                action={{
                  label: "Add Member",
                  onClick: () => console.log("Add member clicked")
                }}
              />
            </Card>
            <Card>
              <EmptyState
                size="md"
                icon={Calendar}
                title="No Events"
                description="No upcoming events scheduled."
              />
            </Card>
            <Card>
              <EmptyState
                size="lg"
                icon={Trophy}
                title="No Competitions"
                description="No active competitions at the moment."
              />
            </Card>
          </div>
        </Section>

        {/* Chart Wrapper */}
        <Section spacing="lg" background="muted">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">Chart Components</h2>
          <ChartWrapper
            title="Sample Chart"
            description="This is how charts are wrapped and presented"
            headerAction={<Button variant="outline" size="sm">Export</Button>}
          >
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Chart content would go here</p>
            </div>
          </ChartWrapper>
        </Section>

        {/* Hero Section */}
        <Hero variant="gradient">
          <HeroTitle>Hero Component</HeroTitle>
          <HeroSubtitle>
            This is how hero sections look with the gradient background 
            and centered content layout.
          </HeroSubtitle>
          <HeroActions>
            <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              Primary Action
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground">
              Secondary Action
            </Button>
          </HeroActions>
        </Hero>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Styleguide;