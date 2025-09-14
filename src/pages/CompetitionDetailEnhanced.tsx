import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import useAuth from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShareUrlDisplay } from "@/components/entry/ShareUrlDisplay";
import { PreviewLink } from "@/components/entry/PreviewLink";
import { format } from 'date-fns';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import SiteHeader from '@/components/layout/SiteHeader';

import Section from '@/components/layout/Section';
import { 
  Copy, 
  Share2, 
  Calendar as CalendarIcon,
  Trophy,
  Users,
  PoundSterling,
  ExternalLink,
  ArrowLeft,
  Edit,
  StopCircle,
  Files,
  Save,
  X
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  obfuscateEmail, 
  getCompetitionStatusColor,
  copyToClipboard
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

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
  commission_amount?: number;
  prize_pool: number;
  is_year_round: boolean;
  archived: boolean;
  club_id: string;
  hero_image_url?: string | null;
  clubs: {
    id: string;
    name: string;
  };
}

interface Entry {
  id: string;
  entry_date: string;
  paid: boolean;
  score: number | null;
  status: string;
  outcome_self: string | null;
  outcome_official: string | null;
  completed_at: string | null;
  attempt_window_start: string | null;
  attempt_window_end: string | null;
  profiles: {
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

const editSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date({ required_error: 'End date is required' }),
  entry_fee: z.number().min(0, 'Entry fee cannot be negative'),
  commission_amount: z.number().min(0, 'Commission amount cannot be negative'),
}).refine((data) => data.start_date < data.end_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type EditFormData = z.infer<typeof editSchema>;

const CompetitionDetailEnhanced = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('entries');
  
  const [stats, setStats] = useState({
    totalEntries: 0,
    todayEntries: 0,
    revenue: 0
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

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
            clubs:clubs(id, name)
          `)
          .eq('id', id)
          .single();

        if (competitionError) throw competitionError;

        // Check if user has access to this competition
        // ADMIN users can access any competition, CLUB users only their own
        if (profile.role === 'CLUB' && competitionData.club_id !== profile.club_id) {
          toast({
            title: 'Access Denied',
            description: 'You can only view competitions from your own club',
            variant: 'destructive',
          });
          return;
        }

        setCompetition(competitionData);
        
        // Initialize edit form with current data
        editForm.reset({
          name: competitionData.name,
          description: competitionData.description,
          start_date: new Date(competitionData.start_date),
          end_date: new Date(competitionData.end_date),
          entry_fee: competitionData.entry_fee / 100, // Convert from cents to pounds
          commission_amount: competitionData.commission_amount ? competitionData.commission_amount / 100 : 0, // Convert from pence to pounds
        });

        // Fetch entries for this competition
        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select(`
            id,
            entry_date,
            paid,
            score,
            status,
            outcome_self,
            outcome_official,
            completed_at,
            attempt_window_start,
            attempt_window_end,
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

        // Calculate stats
        const totalEntries = entriesData?.length || 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEntries = entriesData?.filter(entry => {
          const entryDate = new Date(entry.entry_date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === today.getTime();
        }).length || 0;
        
        const revenue = entriesData?.filter(entry => entry.paid)
          .reduce((sum, entry) => sum + competitionData.entry_fee, 0) || 0;

        setStats({
          totalEntries,
          todayEntries,
          revenue
        });

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
  }, [id, profile, toast, editForm]);

  const handleShareCompetition = async () => {
    if (!competition) return;
    
    // Get venue data to generate new URL format
    const { data: venue } = await supabase
      .from('venues')
      .select('slug')
      .eq('club_id', competition.club_id)
      .single();
    
    const shareUrl = venue 
      ? `${window.location.origin}/enter/${venue.slug}/${competition.hole_number}`
      : `${window.location.origin}/enter/${competition.id}`;
    
    const success = await copyToClipboard(shareUrl);
    
    if (success) {
      toast({
        title: 'Link copied',
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

  const handleSaveChanges = async (data: EditFormData) => {
    if (!competition) return;

    setSaving(true);
    try {
      // Convert entry fee back to cents
      const entry_fee_cents = Math.round(data.entry_fee * 100);
      
      // Determine new status based on dates
      const now = new Date();
      const newStatus = (now >= data.start_date && now <= data.end_date) ? 'ACTIVE' : 'SCHEDULED';

      const { error } = await supabase
        .from('competitions')
        .update({
          name: data.name,
          description: data.description,
          start_date: data.start_date.toISOString(),
          end_date: data.end_date.toISOString(),
          entry_fee: entry_fee_cents,
                  commission_amount: Math.round(data.commission_amount * 100), // Convert to pence
          status: newStatus,
        })
        .eq('id', competition.id);

      if (error) throw error;

      // Update local state
      setCompetition(prev => prev ? {
        ...prev,
        name: data.name,
        description: data.description,
        start_date: data.start_date.toISOString(),
        end_date: data.end_date.toISOString(),
        entry_fee: entry_fee_cents,
        commission_amount: data.commission_amount,
      } : null);

      setIsEditing(false);
      toast({
        title: 'Changes Saved',
        description: 'Competition updated successfully',
      });
    } catch (error) {
      console.error('Error updating competition:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEndNow = async () => {
    if (!competition) return;

    try {
      const { error } = await supabase
        .from('competitions')
        .update({
          status: 'ENDED',
          end_date: new Date().toISOString(),
        })
        .eq('id', competition.id)
        .eq('club_id', profile?.club_id);

      if (error) throw error;

      setCompetition(prev => prev ? {
        ...prev,
        status: 'ENDED',
        end_date: new Date().toISOString(),
      } : null);

      toast({
        title: 'Competition Ended',
        description: 'The competition has been ended successfully',
      });
    } catch (error) {
      console.error('Error ending competition:', error);
      toast({
        title: 'Error',
        description: 'Failed to end competition',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = () => {
    if (!competition) return;

    const prefillData = {
      name: `${competition.name} (Copy)`,
      hole_number: competition.hole_number,
      description: competition.description,
      start_date: new Date(),
      end_date: new Date(Date.now() + 86400000), // +1 day
      entry_fee: competition.entry_fee / 100,
    };

    navigate('/dashboard/club/competitions/new', { state: { prefillData } });
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
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(profile?.role === 'ADMIN' ? '/dashboard/admin/competitions' : '/dashboard/club/competitions')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Competitions
              </Button>
            </div>
            {/* Header with Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">{competition.name}</h1>
                <p className="text-muted-foreground mt-1">
                  {competition.clubs.name} • Hole #{competition.hole_number}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge className={getCompetitionStatusColor(competition.status)}>
                  {competition.status}
                </Badge>
                {competition.archived && (
                  <Badge variant="outline">
                    Archived
                  </Badge>
                )}
                
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate(`/dashboard/admin/competitions/${competition.id}/edit`)}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
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

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Competition?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the competition and all its entries. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('competitions')
                              .delete()
                              .eq('id', competition.id);
                            
                            if (error) throw error;
                            
                            toast({
                              title: "Competition Deleted",
                              description: "Competition has been permanently deleted",
                            });
                            
                            navigate('/dashboard/admin/competitions');
                          } catch (error) {
                            console.error('Error deleting competition:', error);
                            toast({
                              title: "Error",
                              description: "Failed to delete competition",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Competition
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                {competition.status !== 'ENDED' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <StopCircle className="w-4 h-4" />
                        End Now
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>End Competition?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will immediately end the competition and stop accepting new entries. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEndNow}>End Competition</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-2">
                  <Files className="w-4 h-4" />
                  Duplicate
                </Button>
              </div>
            </div>

            {/* Competition Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">
                        {competition.is_year_round 
                          ? `${formatDate(competition.start_date)} - Ongoing`
                          : `${formatDate(competition.start_date)} - ${formatDate(competition.end_date)}`
                        }
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
                      <p className="text-sm text-muted-foreground">Cash Prize</p>
                      <p className="font-semibold">
                        {competition.prize_pool ? formatCurrency(competition.prize_pool) : 'TBD'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {profile?.role === 'ADMIN' && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <PoundSterling className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Commission Amount</p>
                        <p className="font-semibold">
                          {formatCurrency(competition.commission_amount || 0)} per entry
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{stats.totalEntries}</p>
                    <p className="text-sm text-muted-foreground">Total Entries</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{stats.todayEntries}</p>
                    <p className="text-sm text-muted-foreground">Today's Entries</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {stats.revenue > 0 ? formatCurrency(stats.revenue) : '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prize Description */}
            {competition.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Prize Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{competition.description}</p>
                </CardContent>
              </Card>
            )}

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
                    <ShareUrlDisplay 
                      competitionId={competition.id}
                      competitionName={competition.name}
                      clubId={competition.club_id}
                      holeNumber={competition.hole_number}
                      onCopy={handleShareCompetition}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button className="gap-2" onClick={handleShareCompetition}>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </Button>
                    <PreviewLink 
                      competitionId={competition.id}
                      competitionName={competition.name}
                      clubId={competition.club_id}
                      holeNumber={competition.hole_number}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="entries">Entries</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="entries" className="mt-6">
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
                                {(() => {
                                  // Check outcome_self first for auto_miss
                                  if (entry.outcome_self === 'auto_miss') {
                                    return <Badge variant="destructive">Auto Missed</Badge>;
                                  }
                                  
                                  // Check if completed
                                  if (entry.completed_at) {
                                    return (
                                      <Badge variant={entry.score === 1 ? "default" : "secondary"}>
                                        {entry.score === 1 ? "Won" : "Missed"}
                                      </Badge>
                                    );
                                  }
                                  
                                  // Check if expired
                                  if (entry.status === 'expired') {
                                    return <Badge variant="destructive">Expired</Badge>;
                                  }
                                  
                                  // Check attempt window
                                  if (entry.attempt_window_end) {
                                    const now = new Date();
                                    const end = new Date(entry.attempt_window_end);
                                    if (now > end) {
                                      return <Badge variant="destructive">Window Expired</Badge>;
                                    }
                                  }
                                  
                                  // Default to in progress
                                  return <Badge variant="secondary">In Progress</Badge>;
                                })()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Competition Settings</CardTitle>
                      <Button 
                        onClick={() => navigate(`/dashboard/admin/competitions/${competition.id}/edit`)} 
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Competition
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{competition.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Prize Description</p>
                        <p className="font-medium">{competition.description || 'No description provided'}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Hole Number</p>
                          <p className="font-medium">{competition.hole_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Entry Fee</p>
                          <p className="font-medium">
                            {competition.entry_fee === 0 ? 'Free' : formatCurrency(competition.entry_fee)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Cash Prize</p>
                          <p className="font-medium">
                            {competition.prize_pool ? formatCurrency(competition.prize_pool) : 'TBD'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Competition Type</p>
                          <p className="font-medium">
                            {competition.is_year_round ? 'Year-round' : 'Fixed Duration'}
                          </p>
                        </div>
                      </div>
                      
                      {profile?.role === 'ADMIN' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Commission Amount</p>
                            <p className="font-medium">
                              {formatCurrency(competition.commission_amount || 0)} per entry
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <p className="font-medium">{format(new Date(competition.start_date), "PPp")}</p>
                        </div>
                        {!competition.is_year_round && (
                          <div>
                            <p className="text-sm text-muted-foreground">End Date</p>
                            <p className="font-medium">{format(new Date(competition.end_date), "PPp")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </Section>
      </main>
    </div>
  );
};

export default CompetitionDetailEnhanced;