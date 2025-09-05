import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import StatsCard from "@/components/ui/stats-card";
import ChartWrapper from "@/components/ui/chart-wrapper";
import { Users, Calendar, Trophy, TrendingUp, Plus, Settings } from "lucide-react";

const AdminDashboard = () => {
  // Mock data for charts
  const membershipData = [
    { month: "Jan", members: 45 },
    { month: "Feb", members: 52 },
    { month: "Mar", members: 48 },
    { month: "Apr", members: 61 },
    { month: "May", members: 55 },
    { month: "Jun", members: 67 }
  ];

  const sportDistribution = [
    { name: "Tennis", value: 35, color: "#0F3D2E" },
    { name: "Football", value: 28, color: "#C7A24C" },
    { name: "Basketball", value: 20, color: "#1E1E1E" },
    { name: "Swimming", value: 17, color: "#F7F7F5" }
  ];

  const recentActivities = [
    { id: 1, action: "New member registration", user: "John Smith", time: "2 minutes ago", type: "member" },
    { id: 2, action: "Event scheduled", user: "Sarah Johnson", time: "15 minutes ago", type: "event" },
    { id: 3, action: "Payment received", user: "Mike Wilson", time: "1 hour ago", type: "payment" },
    { id: 4, action: "Competition created", user: "Admin", time: "2 hours ago", type: "competition" },
  ];

  const upcomingEvents = [
    { id: 1, name: "Tennis Tournament Finals", date: "Aug 15", participants: 24, status: "confirmed" },
    { id: 2, name: "Weekly Training Session", date: "Aug 17", participants: 15, status: "pending" },
    { id: 3, name: "Club Annual Meeting", date: "Aug 20", participants: 45, status: "confirmed" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1">
        <Section spacing="lg">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-1">Manage your club operations and monitor performance</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
                <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground gap-2">
                  <Plus className="w-4 h-4" />
                  Add Member
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Members"
                value="248"
                description="Active club members"
                icon={Users}
                trend={{ value: 12, isPositive: true }}
              />
              <StatsCard
                title="This Month Events"
                value="8"
                description="Scheduled activities"
                icon={Calendar}
                trend={{ value: 3, isPositive: true }}
              />
              <StatsCard
                title="Competitions"
                value="15"
                description="Ongoing tournaments"
                icon={Trophy}
                trend={{ value: 25, isPositive: true }}
              />
              <StatsCard
                title="Revenue"
                value="$12,450"
                description="Monthly earnings"
                icon={TrendingUp}
                trend={{ value: 8, isPositive: true }}
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-8">
                {/* Membership Growth Chart */}
                <ChartWrapper
                  title="Membership Growth"
                  description="Monthly new member registrations"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={membershipData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Bar dataKey="members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>

                {/* Sport Distribution */}
                <ChartWrapper
                  title="Sport Participation"
                  description="Distribution of members across sports"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sportDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {sportDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartWrapper>

                {/* Upcoming Events */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div>
                            <h4 className="font-medium text-foreground">{event.name}</h4>
                            <p className="text-sm text-muted-foreground">{event.date} • {event.participants} participants</p>
                          </div>
                          <Badge variant={event.status === "confirmed" ? "default" : "secondary"}>
                            {event.status}
                          </Badge>
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
                      <Users className="w-4 h-4" />
                      Add New Member
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Calendar className="w-4 h-4" />
                      Schedule Event
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Trophy className="w-4 h-4" />
                      Create Competition
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivities.map((activity) => (
                        <div key={activity.id} className="text-sm">
                          <p className="font-medium text-foreground">{activity.action}</p>
                          <p className="text-muted-foreground">{activity.user} • {activity.time}</p>
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

export default AdminDashboard;