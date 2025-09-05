import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import StatsCard from "@/components/ui/stats-card";
import ChartWrapper from "@/components/ui/chart-wrapper";
import { Calendar, Users, Clock, MessageSquare, Bell, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ClubDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [clubData, setClubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubData = async () => {
      if (!profile?.club_id) return;
      
      try {
        const { data: club, error } = await supabase
          .from('clubs')
          .select('*')
          .eq('id', profile.club_id)
          .single();

        if (error) throw error;
        setClubData(club);
      } catch (error) {
        console.error('Error fetching club data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && profile) {
      fetchClubData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [profile, authLoading]);

  const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'User';
  const clubName = clubData?.name || 'Your Club';
  // Mock data for attendance chart
  const attendanceData = [
    { week: "Week 1", attendance: 85 },
    { week: "Week 2", attendance: 92 },
    { week: "Week 3", attendance: 78 },
    { week: "Week 4", attendance: 88 },
    { week: "Week 5", attendance: 95 },
    { week: "Week 6", attendance: 82 }
  ];

  const upcomingSessions = [
    { id: 1, name: "Morning Training", time: "08:00 AM", date: "Today", coach: "Sarah Wilson", participants: 15 },
    { id: 2, name: "Junior Practice", time: "04:00 PM", date: "Today", coach: "Mike Johnson", participants: 8 },
    { id: 3, name: "Advanced Training", time: "09:00 AM", date: "Tomorrow", coach: "Sarah Wilson", participants: 12 },
  ];

  const recentAnnouncements = [
    { id: 1, title: "Tournament Registration Open", time: "2 hours ago", urgent: false },
    { id: 2, title: "Court Maintenance Schedule", time: "1 day ago", urgent: true },
    { id: 3, title: "New Club Merchandise Available", time: "3 days ago", urgent: false },
  ];

  const teamMembers = [
    { id: 1, name: "Alex Chen", role: "Captain", avatar: "" },
    { id: 2, name: "Maria Garcia", role: "Vice Captain", avatar: "" },
    { id: 3, name: "James Wilson", role: "Treasurer", avatar: "" },
    { id: 4, name: "Emma Davis", role: "Member", avatar: "" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                {loading ? (
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                ) : (
                  <>
                    {clubData?.logo_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        <img 
                          src={clubData.logo_url} 
                          alt={`${clubName} logo`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Building className="w-8 h-8 text-primary-foreground" />
                      </div>
                    )}
                    <div>
                      <h1 className="font-display text-3xl font-bold text-foreground">
                        Welcome back, {userName}!
                      </h1>
                      <p className="text-muted-foreground mt-1">
                        {clubName} Dashboard
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </Button>
                <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Contact Coach
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Next Session"
                value="2 hours"
                description="Morning Training at 8:00 AM"
                icon={Clock}
              />
              <StatsCard
                title="This Week"
                value="3"
                description="Training sessions attended"
                icon={Calendar}
                trend={{ value: 15, isPositive: true }}
              />
              <StatsCard
                title="Team Members"
                value="24"
                description="Active club members"
                icon={Users}
              />
              <StatsCard
                title="Avg Attendance"
                value="87%"
                description="Last 6 weeks performance"
                icon={Users}
                trend={{ value: 5, isPositive: true }}
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-8">
                {/* Attendance Chart */}
                <ChartWrapper
                  title="Attendance Tracking"
                  description="Your training session attendance over the last 6 weeks"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={attendanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Line 
                        type="monotone" 
                        dataKey="attendance" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>

                {/* Upcoming Sessions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Training Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                          <div>
                            <h4 className="font-medium text-foreground">{session.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {session.date} at {session.time} • Coach: {session.coach}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{session.participants} participants</p>
                            <Button size="sm" variant="outline" className="mt-2">
                              Join Session
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Team Members */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Calendar className="w-4 h-4" />
                      Book Court
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Users className="w-4 h-4" />
                      View Schedule
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Team Chat
                    </Button>
                  </CardContent>
                </Card>

                {/* Announcements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Announcements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentAnnouncements.map((announcement) => (
                        <div key={announcement.id} className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-medium text-foreground">{announcement.title}</h4>
                            {announcement.urgent && (
                              <Badge variant="destructive" className="text-xs">Urgent</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{announcement.time}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ClubDashboard;