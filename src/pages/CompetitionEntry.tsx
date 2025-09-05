import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MapPin, Trophy, Clock, AlertCircle, CheckCircle2, Copy, Target } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { Hero, HeroTitle, HeroSubtitle } from "@/components/ui/hero";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import entryHero from "/img/entry-hero.jpg";

interface CompetitionWithClub {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  entry_fee: number | null;
  prize_pool: number | null;
  hole_number: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED';
  rules: any;
  clubs: {
    name: string;
  };
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
}

const CompetitionEntry = () => {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const [competition, setCompetition] = useState<CompetitionWithClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    consent: false
  });

  useEffect(() => {
    const fetchCompetition = async () => {
      if (!competitionId) return;

      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          clubs (
            name
          )
        `)
        .eq('id', competitionId)
        .single();

      if (error) {
        console.error('Error fetching competition:', error);
        toast({
          title: "Competition not found",
          description: "The competition you're looking for doesn't exist.",
          variant: "destructive"
        });
      } else {
        setCompetition(data);
        setShareUrl(`${window.location.origin}/enter/${competitionId}`);
      }
      
      setLoading(false);
    };

    fetchCompetition();
  }, [competitionId]);

  const getCompetitionStatus = () => {
    if (!competition) return 'SCHEDULED';
    
    const now = new Date();
    const startDate = new Date(competition.start_date);
    const endDate = new Date(competition.end_date);

    if (now < startDate) return 'SCHEDULED';
    if (now > endDate) return 'ENDED';
    return 'ACTIVE';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCountdown = () => {
    if (!competition) return '';
    
    const status = getCompetitionStatus();
    if (status === 'SCHEDULED') {
      const startDate = new Date(competition.start_date);
      const now = new Date();
      const diff = startDate.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `Opens in ${days} days`;
      if (hours > 0) return `Opens in ${hours} hours`;
      return 'Opening soon';
    }
    
    if (status === 'ACTIVE') {
      const endDate = new Date(competition.end_date);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) return `${days} days left`;
      if (hours > 0) return `${hours} hours left`;
      return 'Ending soon';
    }
    
    return 'Competition ended';
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Share link copied!",
      description: "You can now share this competition with others."
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!competition || !formData.consent) {
      toast({
        title: "Please complete all required fields",
        description: "Make sure you've filled out all fields and agreed to the terms.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      let userId = user?.id;

      // If user is not logged in, create a new user account
      if (!user) {
        const { error: signUpError } = await signUp(
          formData.email,
          'temp-password-' + Date.now(), // Generate temporary password
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'PLAYER'
          }
        );

        if (signUpError) {
          throw signUpError;
        }

        // Get the newly created user
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          userId = newUser.id;
        } else {
          throw new Error('Failed to create user account');
        }
      }

      if (!userId) {
        throw new Error('User ID not available');
      }

      // Create entry
      const { error: entryError } = await supabase
        .from('entries')
        .insert({
          competition_id: competitionId!,
          player_id: userId,
          paid: competition.entry_fee ? false : true, // If no entry fee, mark as paid
        });

      if (entryError) {
        throw entryError;
      }

      // Handle payment if required
      if (competition.entry_fee && competition.entry_fee > 0) {
        // TODO: Integrate with Stripe Checkout
        toast({
          title: "Payment required",
          description: "Stripe payment integration will be implemented here.",
        });
      }

      setSubmitted(true);
      toast({
        title: "Entry successful!",
        description: "You've successfully entered the competition."
      });

    } catch (error: any) {
      console.error('Entry error:', error);
      toast({
        title: "Entry failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading competition...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-8">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Competition Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The competition you're looking for doesn't exist or may have been removed.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const currentStatus = getCompetitionStatus();

  // Confirmation screen
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Hero>
            <Container>
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
                <HeroTitle>Thanks for entering!</HeroTitle>
                <HeroSubtitle className="max-w-2xl">
                  You've successfully entered {competition.name}. 
                  Track your entry and see results in your player dashboard.
                </HeroSubtitle>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Button 
                    onClick={() => navigate('/players/entries')}
                    size="lg"
                  >
                    View Your Entries
                  </Button>
                  <Button 
                    onClick={() => navigate('/')}
                    variant="outline"
                    size="lg"
                  >
                    Return Home
                  </Button>
                </div>
              </div>
            </Container>
          </Hero>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <Hero>
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  {competition.clubs.name}
                </Badge>
                <HeroTitle>{competition.name}</HeroTitle>
                <HeroSubtitle className="mb-6">
                  {competition.description || "Join this exciting hole-in-one challenge"}
                </HeroSubtitle>
                
                {/* Status and Countdown */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <Badge 
                    variant={currentStatus === 'ACTIVE' ? 'default' : 'secondary'}
                    className="flex items-center gap-2"
                  >
                    <Clock className="w-3 h-3" />
                    {currentStatus === 'SCHEDULED' && 'Upcoming'}
                    {currentStatus === 'ACTIVE' && 'Live'}
                    {currentStatus === 'ENDED' && 'Ended'}
                  </Badge>
                  <Badge variant="outline">
                    {getCountdown()}
                  </Badge>
                </div>

                {/* Share URL */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    {shareUrl}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyShareUrl}
                    className="shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="relative">
                <img 
                  src={entryHero}
                  alt="Golfer lining up a tee shot"
                  className="rounded-lg shadow-xl w-full"
                  loading="lazy"
                />
              </div>
            </div>
          </Container>
        </Hero>

        <Section>
          <Container>
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
                      <div className="text-sm">
                        <div className="font-medium">Start: {formatDateTime(competition.start_date)}</div>
                        <div className="text-muted-foreground">End: {formatDateTime(competition.end_date)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{competition.clubs.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Hole #{competition.hole_number}</span>
                    </div>
                    
                    {competition.entry_fee && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Entry Fee: £{(competition.entry_fee / 100).toFixed(2)}</span>
                      </div>
                    )}
                    
                    {competition.prize_pool && (
                      <div className="flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Prize Pool: £{(competition.prize_pool / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Entry Form or Status */}
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle>
                    {currentStatus === 'SCHEDULED' && 'Registration Opens Soon'}
                    {currentStatus === 'ACTIVE' && 'Enter Competition'}
                    {currentStatus === 'ENDED' && 'Competition Ended'}
                  </CardTitle>
                  <CardDescription>
                    {currentStatus === 'SCHEDULED' && `Opens ${formatDateTime(competition.start_date)}`}
                    {currentStatus === 'ACTIVE' && 'Fill in your details to enter this competition'}
                    {currentStatus === 'ENDED' && 'This competition has ended'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentStatus === 'SCHEDULED' && (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Registration will open {getCountdown().toLowerCase()}
                      </p>
                      <Button disabled>
                        Opens {formatDateTime(competition.start_date)}
                      </Button>
                    </div>
                  )}

                  {currentStatus === 'ENDED' && (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        This competition ended on {formatDateTime(competition.end_date)}
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/')}
                      >
                        View Other Competitions
                      </Button>
                    </div>
                  )}

                  {currentStatus === 'ACTIVE' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          placeholder="Your first name"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          placeholder="Your last name"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
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
                        <Label htmlFor="phone">Phone Number (optional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="consent"
                          checked={formData.consent}
                          onCheckedChange={(checked) => setFormData({...formData, consent: checked === true})}
                        />
                        <Label 
                          htmlFor="consent" 
                          className="text-sm leading-tight cursor-pointer"
                        >
                          I agree to the competition rules and terms of service *
                        </Label>
                      </div>

                      {competition.entry_fee && competition.entry_fee > 0 && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-semibold text-foreground mb-2">Entry Fee</h4>
                          <div className="flex justify-between items-center text-sm">
                            <span>Competition Entry:</span>
                            <span className="font-semibold">£{(competition.entry_fee / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full"
                        size="lg"
                        disabled={submitting || !formData.consent}
                      >
                        {submitting ? "Submitting..." : 
                         competition.entry_fee && competition.entry_fee > 0 ? 
                         `Enter & Pay £${(competition.entry_fee / 100).toFixed(2)}` : 
                         "Enter Competition"}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        By entering, you agree to the competition rules and terms of service.
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default CompetitionEntry;