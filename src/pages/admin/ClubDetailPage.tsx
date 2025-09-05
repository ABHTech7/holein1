import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Building, Mail, Phone, MapPin, Trophy, FileText, PoundSterling, Plus, Save, Calendar, ArrowLeft, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency } from "@/lib/formatters";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import ClubCommissionSection from "@/components/admin/ClubCommissionSection";
import ClubBankDetailsSection from "@/components/admin/ClubBankDetailsSection";
import { useAuth } from "@/hooks/useAuth";

interface Club {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
  created_at: string;
  logo_url: string | null;
}

interface Competition {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  entry_fee: number;
  commission_rate: number;
  max_participants: number | null;
  status: string;
  total_entries: number;
  total_revenue: number;
  total_commission: number;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
}

const ClubDetailPage = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<Club | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [tempCommissionRate, setTempCommissionRate] = useState<string>("");

  // Form data for editing
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    website: "",
    active: true
  });

  useEffect(() => {
    if (clubId) {
      fetchClubDetails();
    }
  }, [clubId]);

  const fetchClubDetails = async () => {
    try {
      setLoading(true);

      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();

      if (clubError) throw clubError;

      setClub(clubData);
      setFormData({
        name: clubData.name || "",
        address: clubData.address || "",
        email: clubData.email || "",
        phone: clubData.phone || "",
        website: clubData.website || "",
        active: clubData.active
      });

      // Fetch competitions with commission rates
      const { data: competitionsData, error: competitionsError } = await supabase
        .from('competitions')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });

      if (competitionsError) throw competitionsError;

      // Get entries for each competition and calculate commission
      const competitionsWithStats = await Promise.all(
        (competitionsData || []).map(async (competition) => {
          const { data: entries, error: entriesError } = await supabase
            .from('entries')
            .select('id, paid')
            .eq('competition_id', competition.id);

          if (entriesError) {
            console.error('Error fetching entries:', entriesError);
          }

          const totalEntries = entries?.length || 0;
          const paidEntries = entries?.filter(entry => entry.paid).length || 0;
          const totalRevenue = paidEntries * (parseFloat(competition.entry_fee?.toString() || '0'));
          const commissionRate = parseFloat(competition.commission_rate?.toString() || '0');
          const totalCommission = paidEntries * commissionRate;

          return {
            ...competition,
            total_entries: totalEntries,
            total_revenue: totalRevenue,
            total_commission: totalCommission
          };
        })
      );

      setCompetitions(competitionsWithStats);

      // Fetch actual notes from database - for now using mock data
      // TODO: Create proper notes table linked to clubs
      setNotes([
        {
          id: '1',
          content: 'Club manager very responsive and helpful',
          created_at: '2024-01-10',
          created_by: 'Admin'
        }
      ]);

    } catch (error) {
      console.error('Error fetching club details:', error);
      toast({
        title: "Error",
        description: "Failed to load club details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addAuditNote = async (changes: string[]) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();
      
      const adminName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Admin';
      const timestamp = new Date().toISOString();
      const changesList = changes.join(', ');
      
      const auditNote: Note = {
        id: Date.now().toString(),
        content: `Club details updated: ${changesList}`,
        created_at: timestamp,
        created_by: `${adminName} (${new Date().toLocaleString()})`
      };
      
      setNotes(prev => [auditNote, ...prev]);
    } catch (error) {
      console.error('Error adding audit note:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Track changes for audit
      const changes: string[] = [];
      if (club) {
        if (club.name !== formData.name) changes.push(`name changed from "${club.name}" to "${formData.name}"`);
        if (club.address !== formData.address) changes.push(`address updated`);
        if (club.email !== formData.email) changes.push(`email updated`);
        if (club.phone !== formData.phone) changes.push(`phone updated`);
        if (club.website !== formData.website) changes.push(`website updated`);
        if (club.active !== formData.active) changes.push(`status changed to ${formData.active ? 'active' : 'inactive'}`);
      }

      const { error } = await supabase
        .from('clubs')
        .update({
          name: formData.name,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          active: formData.active
        })
        .eq('id', clubId);

      if (error) throw error;

      setClub(prev => prev ? { ...prev, ...formData } : null);
      setEditMode(false);
      
      // Add audit trail if there were changes
      if (changes.length > 0) {
        await addAuditNote(changes);
      }

      toast({
        title: "Success",
        description: "Club details updated successfully.",
      });
    } catch (error) {
      console.error('Error saving club:', error);
      toast({
        title: "Error",
        description: "Failed to save club details.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCommissionEdit = (competitionId: string, currentRate: number) => {
    setEditingCommission(competitionId);
    setTempCommissionRate(currentRate.toString());
  };

  const handleCommissionSave = async (competitionId: string) => {
    try {
      const newRate = parseFloat(tempCommissionRate);
      if (isNaN(newRate) || newRate < 0) {
        toast({
          title: "Error",
          description: "Please enter a valid commission rate",
          variant: "destructive"
        });
        return;
      }

      const competition = competitions.find(c => c.id === competitionId);
      if (!competition) return;

      const { error } = await supabase
        .from('competitions')
        .update({ commission_rate: newRate })
        .eq('id', competitionId);

      if (error) throw error;

      // Update local state
      setCompetitions(prev => prev.map(comp => {
        if (comp.id === competitionId) {
          const updatedComp = { ...comp, commission_rate: newRate };
          // Recalculate commission with new rate
          const paidEntries = Math.round(comp.total_revenue / comp.entry_fee) || 0;
          updatedComp.total_commission = paidEntries * newRate;
          return updatedComp;
        }
        return comp;
      }));

      setEditingCommission(null);
      setTempCommissionRate("");

      // Add audit note for commission change
      await addAuditNote([`competition "${competition.name}" commission rate changed from £${competition.commission_rate} to £${newRate}`]);

      toast({
        title: "Success",
        description: "Commission rate updated successfully",
      });
    } catch (error) {
      console.error('Error updating commission rate:', error);
      toast({
        title: "Error",
        description: "Failed to update commission rate",
        variant: "destructive"
      });
    }
  };

  const handleCommissionCancel = () => {
    setEditingCommission(null);
    setTempCommissionRate("");
  };

  const addNote = () => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: Date.now().toString(),
      content: newNote,
      created_at: new Date().toISOString(),
      created_by: 'Admin (Manual Note)'
    };

    setNotes(prev => [note, ...prev]);
    setNewNote("");
    
    toast({
      title: "Note Added",
      description: "Note has been added successfully.",
    });
  };

  if (loading || !club) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Section className="py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Section>
        <SiteFooter />
      </div>
    );
  }

  const totalRevenue = competitions.reduce((sum, comp) => sum + comp.total_revenue, 0);
  const totalCommission = competitions.reduce((sum, comp) => sum + comp.total_commission, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/admin/clubs')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Clubs
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{club.name}</h1>
                <p className="text-muted-foreground">Club Details & Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={club.active ? "default" : "outline"}>
                {club.active ? "Active" : "Inactive"}
              </Badge>
              {editMode ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setEditMode(true)}>
                  Edit Club
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
                <div className="text-sm text-muted-foreground">Total Commission Generated</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{competitions.length}</div>
                <div className="text-sm text-muted-foreground">Total Competitions</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Club Details</TabsTrigger>
              <TabsTrigger value="competitions">Competitions</TabsTrigger>
              <TabsTrigger value="commission">Commission & Payments</TabsTrigger>
              <TabsTrigger value="banking">Bank Details</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Club Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Club Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      disabled={!editMode}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                      disabled={!editMode}
                    />
                    <Label htmlFor="active">Active Club</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="competitions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Competitions ({competitions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competition</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Entry Fee</TableHead>
                          <TableHead>Commission Rate</TableHead>
                          <TableHead>Entries</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competitions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No competitions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          competitions.map((competition) => (
                            <TableRow key={competition.id}>
                              <TableCell className="font-medium">{competition.name}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{formatDate(competition.start_date, 'short')}</div>
                                  <div className="text-muted-foreground">to {formatDate(competition.end_date, 'short')}</div>
                                </div>
                              </TableCell>
                              <TableCell>{formatCurrency(competition.entry_fee)}</TableCell>
                              <TableCell>
                                {editingCommission === competition.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={tempCommissionRate}
                                      onChange={(e) => setTempCommissionRate(e.target.value)}
                                      className="w-20 h-8"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCommissionSave(competition.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Check className="w-4 h-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={handleCommissionCancel}
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>{formatCurrency(competition.commission_rate)}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCommissionEdit(competition.id, competition.commission_rate)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {competition.total_entries}
                                {competition.max_participants && ` / ${competition.max_participants}`}
                              </TableCell>
                              <TableCell className="font-medium">{formatCurrency(competition.total_revenue)}</TableCell>
                              <TableCell className="font-medium text-green-600">{formatCurrency(competition.total_commission)}</TableCell>
                              <TableCell>
                                <Badge variant={competition.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                  {competition.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commission">
              <ClubCommissionSection clubId={clubId!} />
            </TabsContent>

            <TabsContent value="banking">
              <ClubBankDetailsSection clubId={clubId!} />
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes & Comments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNote()}
                    />
                    <Button onClick={addNote}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">{note.created_by}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(note.created_at, 'short')}
                          </span>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
};

export default ClubDetailPage;