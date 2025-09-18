import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { 
  Trophy, 
  Plus, 
  Eye, 
  Edit,
  Archive,
  Calendar,
  PoundSterling,
  Users,
  Target,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useAuth from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/formatters";

interface Competition {
  id: string;
  name: string;
  description: string | null;
  hole_number: number;
  entry_fee: number;
  prize_pool: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  is_year_round: boolean;
  archived: boolean;
  created_at: string;
  _count?: {
    entries: number;
  };
}

const ClubCompetitionManagement = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hole_number: 1,
    entry_fee: 5.00,
    prize_pool: 100.00,
    start_date: "",
    end_date: "",
    is_year_round: false
  });

  useEffect(() => {
    if (!user || profile?.role !== 'CLUB') {
      navigate('/');
      return;
    }
    fetchCompetitions();
  }, [user, profile, navigate]);

  const fetchCompetitions = async () => {
    if (!profile?.club_id) return;

    try {
      // Get competitions with entry counts
      const { data: competitions, error } = await supabase
        .from('competitions')
        .select(`
          *,
          entries:entries(count)
        `)
        .eq('club_id', profile.club_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include entry counts
      const competitionsWithCounts = competitions?.map(comp => ({
        ...comp,
        _count: {
          entries: comp.entries?.length || 0
        }
      })) || [];

      setCompetitions(competitionsWithCounts);

    } catch (error: any) {
      console.error('Error fetching competitions:', error);
      toast({
        title: "Error Loading Competitions",
        description: "Unable to load your competitions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      hole_number: 1,
      entry_fee: 5.00,
      prize_pool: 100.00,
      start_date: "",
      end_date: "",
      is_year_round: false
    });
    setEditingCompetition(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (competition: Competition) => {
    setFormData({
      name: competition.name,
      description: competition.description || "",
      hole_number: competition.hole_number,
      entry_fee: competition.entry_fee,
      prize_pool: competition.prize_pool || 0,
      start_date: competition.start_date.split('T')[0],
      end_date: competition.end_date?.split('T')[0] || "",
      is_year_round: competition.is_year_round
    });
    setEditingCompetition(competition);
    setShowCreateModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!profile?.club_id) return;

    setSubmitting(true);

    try {
      const competitionData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        hole_number: formData.hole_number,
        entry_fee: formData.entry_fee,
        prize_pool: formData.prize_pool || null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.is_year_round ? null : 
          formData.end_date ? new Date(formData.end_date).toISOString() : null,
        is_year_round: formData.is_year_round,
        club_id: profile.club_id,
        status: 'ACTIVE' as any
      };

      if (editingCompetition) {
        // Update existing competition
        const { error } = await supabase
          .from('competitions')
          .update(competitionData)
          .eq('id', editingCompetition.id);

        if (error) throw error;

        toast({
          title: "Competition updated",
          description: "Your competition has been updated successfully.",
        });
      } else {
        // Create new competition
        const { error } = await supabase
          .from('competitions')
          .insert(competitionData);

        if (error) throw error;

        toast({
          title: "Competition created",
          description: "Your new competition is now live!",
        });
      }

      setShowCreateModal(false);
      resetForm();
      fetchCompetitions();

    } catch (error: any) {
      console.error('Competition submission error:', error);
      toast({
        title: "Submission failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (competitionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ status: newStatus as any })
        .eq('id', competitionId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Competition ${newStatus.toLowerCase()} successfully`,
      });

      fetchCompetitions();

    } catch (error: any) {
      console.error('Status update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleArchive = async (competitionId: string) => {
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ archived: true })
        .eq('id', competitionId);

      if (error) throw error;

      toast({
        title: "Competition archived",
        description: "Competition has been archived and is no longer visible to players",
      });

      fetchCompetitions();

    } catch (error: any) {
      console.error('Archive error:', error);
      toast({
        title: "Archive failed",
        description: error.message || "Failed to archive competition",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, isArchived: boolean) => {
    if (isArchived) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Archived</Badge>;
    }
    
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'PAUSED':
        return <Badge variant="outline" className="border-amber-400 text-amber-600">Paused</Badge>;
      case 'ENDED':
        return <Badge variant="secondary">Ended</Badge>;
      case 'SCHEDULED':
        return <Badge variant="outline">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading competitions...</p>
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
        {/* Header */}
        <Section spacing="lg" className="bg-muted/30">
          <Container>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Competition Management
                </h1>
                <p className="text-muted-foreground">
                  Create and manage your club's hole-in-one competitions
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => navigate('/club')}>
                  Back to Dashboard
                </Button>
                
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary hover:opacity-90" onClick={handleCreate}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Competition
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCompetition ? 
                          'Update your competition details' : 
                          'Set up a new hole-in-one competition for your club'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Basic Details */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Competition Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Sunday Morning Official Hole In 1"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the competition"
                            rows={3}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="hole">Hole Number *</Label>
                            <Select 
                              value={formData.hole_number.toString()} 
                              onValueChange={(value) => setFormData(prev => ({ ...prev, hole_number: parseInt(value) }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select hole" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({length: 18}, (_, i) => (
                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    Hole {i + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="entry-fee">Entry Fee (£) *</Label>
                            <Input
                              id="entry-fee"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.entry_fee}
                              onChange={(e) => setFormData(prev => ({ ...prev, entry_fee: parseFloat(e.target.value) || 0 }))}
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="prize-pool">Prize Pool (£)</Label>
                          <Input
                            id="prize-pool"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.prize_pool}
                            onChange={(e) => setFormData(prev => ({ ...prev, prize_pool: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>

                      {/* Date Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="year-round"
                            checked={formData.is_year_round}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_year_round: checked }))}
                          />
                          <Label htmlFor="year-round">Year-round competition</Label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="start-date">Start Date *</Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={formData.start_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                              required
                            />
                          </div>
                          
                          {!formData.is_year_round && (
                            <div>
                              <Label htmlFor="end-date">End Date</Label>
                              <Input
                                id="end-date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="flex-1"
                        >
                          {submitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              {editingCompetition ? 'Updating...' : 'Creating...'}
                            </>
                          ) : (
                            <>
                              <Trophy className="w-4 h-4 mr-2" />
                              {editingCompetition ? 'Update Competition' : 'Create Competition'}
                            </>
                          )}
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCreateModal(false)}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Container>
        </Section>

        {/* Competitions Table */}
        <Section spacing="lg">
          <Container>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span>Your Competitions</span>
                </CardTitle>
                <CardDescription>
                  Manage all your club's hole-in-one competitions
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {competitions.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No Competitions Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Create your first competition to start attracting players
                    </p>
                    <Button onClick={handleCreate} className="bg-gradient-primary hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Competition
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competition</TableHead>
                          <TableHead>Hole</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Entry Fee</TableHead>
                          <TableHead>Prize Pool</TableHead>
                          <TableHead>Entries</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competitions.map((competition) => (
                          <TableRow key={competition.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold">{competition.name}</div>
                                {competition.description && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {competition.description.substring(0, 50)}
                                    {competition.description.length > 50 ? '...' : ''}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <Badge variant="outline">{competition.hole_number}</Badge>
                            </TableCell>
                            
                            <TableCell>
                              {getStatusBadge(competition.status, competition.archived)}
                            </TableCell>
                            
                            <TableCell>{formatCurrency(competition.entry_fee)}</TableCell>
                            
                            <TableCell>
                              {competition.prize_pool ? formatCurrency(competition.prize_pool) : '-'}
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{competition._count?.entries || 0}</span>
                              </div>
                            </TableCell>
                            
                            <TableCell>{formatDateTime(competition.created_at)}</TableCell>
                            
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/competitions/${competition.id}`)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                
                                {!competition.archived && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(competition)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    
                                    {competition.status === 'ACTIVE' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleStatusChange(competition.id, 'PAUSED')}
                                      >
                                        <Pause className="w-4 h-4" />
                                      </Button>
                                    )}
                                    
                                    {competition.status === 'PAUSED' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleStatusChange(competition.id, 'ACTIVE')}
                                      >
                                        <Play className="w-4 h-4" />
                                      </Button>
                                    )}
                                    
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleArchive(competition.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Archive className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
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

export default ClubCompetitionManagement;