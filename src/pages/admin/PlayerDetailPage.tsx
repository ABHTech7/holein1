import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Phone, Calendar, Trophy, FileText, PoundSterling, Plus, Save, ArrowLeft, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/formatters";
import SiteHeader from "@/components/layout/SiteHeader";
import Section from "@/components/layout/Section";
import { useAuth } from "@/hooks/useAuth";
import { trackPlayerChanges } from "@/lib/auditTracker";
import PlayerJourneyTimeline from "@/components/admin/PlayerJourneyTimeline";

interface Player {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  role: string;
}

interface Entry {
  id: string;
  entry_date: string;
  paid: boolean;
  score: number | null;
  completed_at: string | null;
  competition: {
    id: string;
    name: string;
    entry_fee: number;
    club_name: string;
  };
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  immutable?: boolean;
}

const PlayerDetailPage = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Form data for editing
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    if (playerId) {
      fetchPlayerDetails();
    }
  }, [playerId]);

  const fetchPlayerDetails = async () => {
    try {
      setLoading(true);

      // Fetch player details
      const { data: playerData, error: playerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerError) throw playerError;

      setPlayer(playerData);
      setFormData({
        first_name: playerData.first_name || "",
        last_name: playerData.last_name || "",
        email: playerData.email || "",
        phone: playerData.phone || ""
      });

      // Fetch player entries with competition details
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select(`
          *,
          competitions!inner(
            id,
            name,
            entry_fee,
            clubs!inner(name)
          )
        `)
        .eq('player_id', playerId)
        .order('entry_date', { ascending: false });

      if (entriesError) throw entriesError;

      const formattedEntries = (entriesData || []).map(entry => ({
        ...entry,
        competition: {
          id: entry.competitions.id,
          name: entry.competitions.name,
          entry_fee: entry.competitions.entry_fee,
          club_name: (entry.competitions.clubs as any).name
        }
      }));

      setEntries(formattedEntries);

      // Fetch notes from database
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_type', 'player')
        .eq('entity_id', playerId)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('Error fetching notes:', notesError);
      }

      const formattedNotes = notesData?.map(note => ({
        id: note.id,
        content: note.content,
        created_at: note.created_at,
        created_by: note.created_by_name || 'Unknown User',
        immutable: note.immutable
      })) || [];
      
      setNotes(formattedNotes);

    } catch (error) {
      console.error('Error fetching player details:', error);
      toast({
        title: "Error",
        description: "Failed to load player details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const oldData = player;
      const newData = formData;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone
        })
        .eq('id', playerId);

      if (error) throw error;

      // Track changes with audit system
      if (oldData && playerId) {
        const auditNote = await trackPlayerChanges(playerId, oldData, newData, user?.id);
        if (auditNote) {
          setNotes(prev => [auditNote, ...prev]);
        }
      }

      setPlayer(prev => prev ? { ...prev, ...formData } : null);
      setEditMode(false);

      toast({
        title: "Success",
        description: "Player details updated successfully.",
      });
    } catch (error) {
      console.error('Error saving player:', error);
      toast({
        title: "Error",
        description: "Failed to save player details.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !user || !playerId) return;

    try {
      // Get user's full name
      const userFullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email : user.email;

      const { data: noteData, error } = await supabase
        .from('notes')
        .insert({
          entity_type: 'player',
          entity_id: playerId,
          content: newNote,
          created_by: user.id,
          created_by_name: userFullName,
          immutable: false,
          note_type: 'manual'
        })
        .select()
        .single();

      if (error) throw error;

      const note: Note = {
        id: noteData.id,
        content: noteData.content,
        created_at: noteData.created_at,
        created_by: noteData.created_by_name,
        immutable: false
      };

      setNotes(prev => [note, ...prev]);
      setNewNote("");
      
      toast({
        title: "Note Added",
        description: "Note has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading || !player) {
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
      </div>
    );
  }

  const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unnamed Player' : 'Loading...';
  const totalRevenue = entries.reduce((sum, entry) => sum + (entry.paid ? entry.competition.entry_fee : 0), 0);
  const totalEntries = entries.length;
  const paidEntries = entries.filter(entry => entry.paid).length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <Section className="py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/admin/players')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Players
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{playerName}</h1>
                <p className="text-muted-foreground">Player Details & Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={totalEntries > 0 ? "default" : "outline"}>
                {totalEntries > 0 ? "Active" : "Inactive"}
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
                  Edit Player
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
                <div className="text-2xl font-bold">{totalEntries}</div>
                <div className="text-sm text-muted-foreground">Total Entries</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{paidEntries}</div>
                <div className="text-sm text-muted-foreground">Paid Entries</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="journey">Journey</TabsTrigger>
              <TabsTrigger value="entries">Entries</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Player Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!editMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!editMode}
                      placeholder="Enter mobile number"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Registration Date</Label>
                      <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                        {formatDate(player.created_at, 'long')}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                        {player.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="journey">
              <PlayerJourneyTimeline 
                playerId={playerId!} 
                playerData={player}
              />
            </TabsContent>

            <TabsContent value="entries">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Competition Entries ({entries.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Competition</TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead>Entry Date & Time</TableHead>
                        <TableHead>Entry Fee</TableHead>
                        <TableHead>Payment Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No competition entries found
                          </TableCell>
                        </TableRow>
                      ) : (
                        entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.competition.name}</TableCell>
                            <TableCell>{entry.competition.club_name}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{formatDate(entry.entry_date, 'short')}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(entry.entry_date)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(entry.competition.entry_fee)}</TableCell>
                            <TableCell>
                              <Badge variant={entry.paid ? "default" : "destructive"}>
                                {entry.paid ? "Paid" : "Unpaid"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {/* Unpaid Entries Section */}
                  {entries.filter(entry => !entry.paid).length > 0 && (
                    <div className="mt-6 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                      <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3">
                        Outstanding Payments
                      </h4>
                      <div className="space-y-2">
                        {entries.filter(entry => !entry.paid).map((entry) => (
                          <div key={entry.id} className="flex justify-between items-center text-sm">
                            <span>{entry.competition.name}</span>
                            <span className="font-medium text-destructive">
                              {formatCurrency(entry.competition.entry_fee)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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

                  {profile?.role === 'ADMIN' && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                      <Shield className="w-3 h-3 inline mr-1" />
                      <strong>Admin View:</strong> Blue highlighted notes are immutable system audit records tracking all changes made to this player.
                    </div>
                  )}

                  <div className="space-y-3">
                    {notes.filter(note => !note.immutable || profile?.role === 'ADMIN').map((note) => (
                      <div key={note.id} className={`p-3 border rounded-lg ${note.immutable ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {note.immutable && <Shield className="w-4 h-4 text-blue-600" />}
                            <span className={`text-sm font-medium ${note.immutable ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                              {note.created_by}
                            </span>
                            {note.immutable && (
                              <Badge variant="secondary" className="text-xs">
                                System Audit
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(note.created_at, 'short')}
                          </span>
                        </div>
                        <p className={`text-sm ${note.immutable ? 'text-blue-800 dark:text-blue-200' : ''}`}>
                          {note.content}
                        </p>
                        {note.immutable && profile?.role === 'ADMIN' && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                            This audit record cannot be modified or deleted
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Section>
    </div>
  );
};

export default PlayerDetailPage;