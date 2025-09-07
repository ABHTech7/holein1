import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import useAuth from '@/hooks/useAuth';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SiteHeader from '@/components/layout/SiteHeader';
import Section from '@/components/layout/Section';
import { 
  Copy, 
  Share2, 
  Calendar,
  Trophy,
  Users,
  PoundSterling,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  obfuscateEmail, 
  getCompetitionStatusColor,
  copyToClipboard
} from '@/lib/formatters';

interface Profile {
  id: string;
  role: 'ADMIN' | 'CLUB' | 'PLAYER';
  club_id?: string;
}

interface Competition {
  id: string;
  name: string;
  description: string;
  hole_number: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED';
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: number;
  archived: boolean;
  clubs: {
    name: string;
  };
}

interface Entry {
  id: string;
  entry_date: string;
  paid: boolean;
  score: number | null;
  completed_at: string | null;
  profiles: {
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

const CompetitionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, club_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive',
        });
      }
    };

    fetchProfile();
  }, [user, toast]);

  // Fetch competition data
  useEffect(() => {
    const fetchCompetition = async () => {
      if (!id || !profile) return;

      try {
        // Fetch competition details
        const { data: competitionData, error: competitionError } = await supabase
          .from('competitions')
          .select(`
            *,
            clubs:clubs(name)
          `)
          .eq('id', id)
          .single();

        if (competitionError) throw competitionError;

        // Check if user has access to this competition
        if (profile.role === 'CLUB' && competitionData.club_id !== profile.club_id) {
          toast({
            title: 'Access Denied',
            description: 'You can only view competitions from your own club',
            variant: 'destructive',
          });
          return;
        }

        setCompetition(competitionData);

        // Fetch entries for this competition
        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select(`
            id,
            entry_date,
            paid,
            score,
            completed_at,
            profiles:profiles(
              email,
              first_name,
              last_name
            )
          `)
          .eq('competition_id', id)
          .order('entry_date', { ascending: false });

        if (entriesError) throw entriesError;
        setEntries(entriesData || []);

      } catch (error) {
        console.error('Error fetching competition:', error);
        toast({
          title: 'Error',
          description: 'Failed to load competition details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [id, profile, toast]);

  const handleShareCompetition = async () => {
    if (!competition) return;
    
    const shareUrl = `${window.location.origin}/enter/${competition.id}`;
    const success = await copyToClipboard(shareUrl);
    
    if (success) {
      toast({
        title: 'Share Link Copied!',
        description: 'Use this URL in your external QR code generator',
      });
    } else {
      toast({
        title: 'Copy Failed',
        description: 'Please manually copy the share link',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Section spacing="lg">
            <div className="max-w-4xl mx-auto space-y-8">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-8 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </Section>
        </main>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Competition Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The competition you're looking for could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(profile?.role === 'ADMIN' ? '/dashboard/admin/competitions' : '/dashboard/club/competitions')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Competitions
              </Button>
              
              <div className="flex items-center gap-2 ml-auto">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate(`/dashboard/admin/competitions/${competition.id}/edit`)}
                  className="gap-2"
                >
                  Edit Competition
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const isCurrentlyArchived = competition.archived;
                      const newArchivedStatus = !isCurrentlyArchived;
                      
                      let newStatus = competition.status;
                      if (newArchivedStatus) {
                        // Archiving - set to ENDED
                        newStatus = 'ENDED';
                      } else {
                        // Unarchiving - determine status based on dates
                        const now = new Date();
                        const startDate = new Date(competition.start_date);
                        const endDate = new Date(competition.end_date);
                        
                        if (now < startDate) {
                          newStatus = 'SCHEDULED';
                        } else if (now >= startDate && now <= endDate) {
                          newStatus = 'ACTIVE';
                        } else {
                          newStatus = 'ENDED';
                        }
                      }
                      
                      const { error } = await supabase
                        .from('competitions')
                        .update({ 
                          archived: newArchivedStatus,
                          status: newStatus
                        })
                        .eq('id', competition.id);
                      
                      if (error) throw error;
                      
                      setCompetition(prev => prev ? { 
                        ...prev, 
                        archived: newArchivedStatus,
                        status: newStatus
                      } : null);
                      
                      toast({
                        title: "Success",
                        description: `Competition ${isCurrentlyArchived ? 'unarchived' : 'archived'} and status updated to ${newStatus}`,
                      });
                    } catch (error) {
                      console.error('Error archiving competition:', error);
                      toast({
                        title: "Error",
                        description: "Failed to archive competition",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="gap-2"
                >
                  {competition.archived ? 'Unarchive' : 'Archive'}
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">{competition.name}</h1>
                <p className="text-muted-foreground mt-1">
                  {competition.clubs.name} • Hole #{competition.hole_number}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getCompetitionStatusColor(competition.status)}>
                  {competition.status}
                </Badge>
                {competition.archived && (
                  <Badge variant="outline">
                    Archived
                  </Badge>
                )}
              </div>
            </div>

            {/* Competition Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">
                        {formatDate(competition.start_date)} - {formatDate(competition.end_date)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <PoundSterling className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Entry Fee</p>
                      <p className="font-semibold">
                        {competition.entry_fee === 0 ? 'Free' : formatCurrency(competition.entry_fee)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prize Pool</p>
                      <p className="font-semibold">
                        {competition.prize_pool ? formatCurrency(competition.prize_pool) : 'TBD'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Share Link Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Share Competition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      Use this link to promote your competition. Perfect for QR codes, social media, and direct sharing.
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                      <code className="flex-1 text-sm">
                        {window.location.origin}/enter/{competition.id}
                      </code>
                      <Button size="sm" variant="outline" onClick={handleShareCompetition}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button className="gap-2" onClick={handleShareCompetition}>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </Button>
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={`/enter/${competition.id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        Preview
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competition Details */}
            {competition.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{competition.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Entries */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Entries ({entries.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No entries yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Share the competition link to start receiving entries
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Entry Date</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                 {entry.profiles?.first_name && entry.profiles?.last_name 
                                   ? `${entry.profiles?.first_name} ${entry.profiles?.last_name}`
                                   : entry.profiles?.email ? obfuscateEmail(entry.profiles.email) : 'Unknown User'
                                 }
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {entry.profiles?.email ? obfuscateEmail(entry.profiles.email) : 'No email'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{formatDateTime(entry.entry_date)}</TableCell>
                          <TableCell>
                            <Badge variant={entry.paid ? "default" : "secondary"}>
                              {competition.entry_fee === 0 ? "FREE" : entry.paid ? "PAID" : "PENDING"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.score !== null ? entry.score : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.completed_at ? "default" : "outline"}>
                              {entry.completed_at ? "Completed" : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>
    </div>
  );
};

export default CompetitionDetail;