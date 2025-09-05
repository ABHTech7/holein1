import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import useAuth from '@/hooks/useAuth';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatsCard from '@/components/ui/stats-card';
import SiteHeader from '@/components/layout/SiteHeader';
import Section from '@/components/layout/Section';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface Profile {
  id: string;
  role: 'ADMIN' | 'CLUB' | 'PLAYER';
  club_id?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
}

interface Club {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Entry {
  id: string;
  competition_name: string;
  entry_date: string;
  entry_fee: number;
  paid: boolean;
}

const ClubRevenue = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<Profile>>({});
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalEntries: 0
  });
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);

  // Fetch user profile and club data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, club_id, first_name, last_name, email, phone')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);
        setEditedProfile({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
          phone: profileData.phone
        });

        if (profileData.club_id) {
          // Fetch club details
          const { data: clubData, error: clubError } = await supabase
            .from('clubs')
            .select('id, name, email, phone, address')
            .eq('id', profileData.club_id)
            .single();

          if (clubError) throw clubError;
          setClub(clubData);

          // Fetch revenue data
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          const { data: entriesData } = await supabase
            .from('entries')
            .select(`
              id,
              entry_date,
              paid,
              competitions!inner(
                name,
                entry_fee,
                club_id
              )
            `)
            .eq('competitions.club_id', profileData.club_id)
            .order('entry_date', { ascending: false });

          if (entriesData) {
            const totalRevenue = entriesData
              .filter(e => e.paid)
              .reduce((sum, e) => sum + e.competitions.entry_fee, 0);

            const monthlyRevenue = entriesData
              .filter(e => e.paid && new Date(e.entry_date) >= monthStart)
              .reduce((sum, e) => sum + e.competitions.entry_fee, 0);

            setStats({
              totalRevenue,
              monthlyRevenue,
              totalEntries: entriesData.length
            });

            // Process recent entries
            setRecentEntries(entriesData.slice(0, 10).map(entry => ({
              id: entry.id,
              competition_name: entry.competitions.name,
              entry_date: entry.entry_date,
              entry_fee: entry.competitions.entry_fee,
              paid: entry.paid
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editedProfile.first_name,
          last_name: editedProfile.last_name,
          phone: editedProfile.phone
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        ...editedProfile
      });
      setIsEditingProfile(false);
      
      toast({
        title: 'Profile Updated',
        description: 'Your contact details have been updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth guards
  if (!user) {
    return <Navigate to="/players/login" replace />;
  }

  if (!profile || profile.role !== 'CLUB') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is only accessible to club representatives.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Club Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                {club?.name} - Revenue Overview & Contact Details
              </p>
            </div>

            {/* Revenue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Total Revenue"
                value={formatCurrency(stats.totalRevenue)}
                icon={Trophy}
              />
              <StatsCard
                title="This Month"
                value={formatCurrency(stats.monthlyRevenue)}
                icon={Calendar}
              />
              <StatsCard
                title="Total Entries"
                value={stats.totalEntries}
                icon={TrendingUp}
              />
            </div>

            {/* Contact Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Contact Details</CardTitle>
                <Button
                  variant={isEditingProfile ? "default" : "outline"}
                  onClick={() => {
                    if (isEditingProfile) {
                      handleSaveProfile();
                    } else {
                      setIsEditingProfile(true);
                    }
                  }}
                >
                  {isEditingProfile ? 'Save Changes' : 'Edit Details'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={editedProfile.first_name || ''}
                      disabled={!isEditingProfile}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, first_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={editedProfile.last_name || ''}
                      disabled={!isEditingProfile}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, last_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={editedProfile.email || ''}
                      disabled={true} // Email cannot be changed
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editedProfile.phone || ''}
                      disabled={!isEditingProfile}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                {isEditingProfile && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditedProfile({
                          first_name: profile?.first_name,
                          last_name: profile?.last_name,
                          email: profile?.email,
                          phone: profile?.phone
                        });
                        setIsEditingProfile(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Entry Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {recentEntries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No entries yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Competition</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry Fee</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.competition_name}</TableCell>
                          <TableCell>{formatDate(entry.entry_date)}</TableCell>
                          <TableCell>{formatCurrency(entry.entry_fee)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              entry.paid 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                            }`}>
                              {entry.paid ? 'Paid' : 'Pending'}
                            </span>
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

export default ClubRevenue;