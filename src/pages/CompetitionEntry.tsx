import { useParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, Clock } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";

const CompetitionEntry = () => {
  const { competitionId } = useParams();
  const [formData, setFormData] = useState({
    playerName: "",
    email: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: ""
  });

  // Mock competition data - in real app, this would be fetched based on competitionId
  const competition = {
    id: competitionId,
    name: "Summer Championship 2024",
    sport: "Tennis",
    date: "August 15-17, 2024",
    location: "Central Sports Complex",
    registrationFee: "$50",
    maxParticipants: 64,
    currentParticipants: 42,
    description: "Annual summer tennis championship featuring singles and doubles competitions across multiple age categories.",
    categories: ["Under 18", "Open", "Senior (35+)"],
    prizes: ["Champion Trophy", "$500 Prize Money", "Runner-up Medal"]
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Competition entry submitted:", formData);
    // Handle form submission
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="xl">
          <div className="max-w-4xl mx-auto">
            {/* Competition Header */}
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-primary/10 text-primary">{competition.sport}</Badge>
              <h1 className="font-display text-4xl font-bold text-foreground mb-4">
                {competition.name}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {competition.description}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Competition Details */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      Competition Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{competition.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{competition.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {competition.currentParticipants}/{competition.maxParticipants} participants
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Registration Fee: {competition.registrationFee}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {competition.categories.map((category, index) => (
                        <Badge key={index} variant="outline">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Prizes & Awards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {competition.prizes.map((prize, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Trophy className="w-4 h-4 text-secondary" />
                          {prize}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Registration Form */}
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle>Competition Registration</CardTitle>
                  <CardDescription>
                    Fill in your details to register for {competition.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="playerName">Full Name *</Label>
                      <Input
                        id="playerName"
                        placeholder="Enter your full name"
                        value={formData.playerName}
                        onChange={(e) => setFormData({...formData, playerName: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="emergencyContact">Emergency Contact Name *</Label>
                      <Input
                        id="emergencyContact"
                        placeholder="Emergency contact person"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="emergencyPhone">Emergency Contact Phone *</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.emergencyPhone}
                        onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})}
                        required
                      />
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Registration Summary</h4>
                      <div className="flex justify-between items-center text-sm">
                        <span>Registration Fee:</span>
                        <span className="font-semibold">{competition.registrationFee}</span>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold"
                      size="lg"
                    >
                      Register & Pay {competition.registrationFee}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      By registering, you agree to the competition rules and terms of service.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default CompetitionEntry;