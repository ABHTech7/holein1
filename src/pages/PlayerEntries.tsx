import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { Trophy, Target, Calendar, Clock, PoundSterling } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/formatters";
import { PlayerGreeting } from "@/components/ui/player-greeting";

interface Entry {
  id: string;
  entry_date: string;
  paid: boolean;
  score: number | null;
  completed_at: string | null;
  competition: {
    id: string;
    name: string;
    status: string;
    entry_fee: number;
    start_date: string;
    end_date: string;
    club: {
      name: string;
    };
  };
  claims: Array<{
    id: string;
    status: string;
  }>;
}

const PlayerEntries = () => {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select(`
          *,
          competition:competitions(
            id,
            name,
            status,
            entry_fee,
            start_date,
            end_date,
            club:clubs(name)
          ),
          claims(
            id,
            status
          )
        `)
        .eq('player_id', user?.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching entries:', error);
      toast({
        title: "Error Loading Entries",
        description: "Unable to load your competition entries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (entry: Entry) => {
    if (!entry.completed_at) {
      return <Badge variant="outline" className="text-muted-foreground">In Progress</Badge>;
    }
    
    // If there are approved claims, they won
    const hasWinningClaim = entry.claims?.some(claim => claim.status === 'APPROVED');
    if (hasWinningClaim) {
      return <Badge variant="default" className="bg-accent text-accent-foreground">Won! 🏆</Badge>;
    }
    
    // If completed but no winning claims, they missed
    return <Badge variant="secondary">Missed</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-accent text-accent-foreground">Active</Badge>;
      case 'ENDED':
        return <Badge variant="secondary">Completed</Badge>;
      case 'SCHEDULED':
        return <Badge variant="outline">Upcoming</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your entries...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Header Section */}
        <Section spacing="lg" className="bg-muted/30">
          <Container>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                {/* Player Greeting */}
                {user && profile?.first_name && (
                  <PlayerGreeting 
                    firstName={profile.first_name} 
                    variant="hero"
                    className="mb-2"
                  />
                )}
                
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                  My Competition Entries
                </h1>
                <p className="text-muted-foreground">
                  Track your progress across all golf challenges and competitions
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <Link to="/competitions">Browse Competitions</Link>
                </Button>
                <Button asChild className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
                  <Link to="/dashboard">My Dashboard</Link>
                </Button>
              </div>
            </div>
          </Container>
        </Section>

        {/* Quick Stats */}
        <Section spacing="md">
          <Container>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                      <p className="text-2xl font-bold text-foreground">{entries.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Competitions</p>
                      <p className="text-2xl font-bold text-foreground">
                        {entries.filter(entry => entry.competition.status === 'ACTIVE').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-foreground">
                        {entries.filter(entry => entry.completed_at).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <PoundSterling className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Invested</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(entries.reduce((sum, entry) => sum + (entry.paid ? entry.competition.entry_fee : 0), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Container>
        </Section>

        {/* Entries Table */}
        <Section spacing="lg">
          <Container>
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  <span>Recent Entries</span>
                </CardTitle>
                <CardDescription>
                  Your competition history and current challenges
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No Entries Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start your journey by entering your first competition
                    </p>
                    <Button asChild className="bg-gradient-primary hover:opacity-90 text-primary-foreground">
                      <Link to="/competitions">Browse Competitions</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competition</TableHead>
                          <TableHead>Club</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Entry Date & Time</TableHead>
                          <TableHead>Entry Fee</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                              <Link 
                                to={`/competitions/${entry.competition.id}`}
                                className="text-primary hover:underline"
                              >
                                {entry.competition.name}
                              </Link>
                            </TableCell>
                            <TableCell>{entry.competition.club.name}</TableCell>
                            <TableCell>{getStatusBadge(entry.competition.status)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{formatDate(entry.entry_date)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(entry.entry_date)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(entry.competition.entry_fee)}</TableCell>
                            <TableCell>{getResultBadge(entry)}</TableCell>
                            <TableCell>
                              {entry.completed_at ? (
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-accent" />
                                  <span className="text-sm">{formatDate(entry.completed_at)}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">In Progress</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </Container>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PlayerEntries;