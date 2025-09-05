import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Calendar, Trophy, FileText, CreditCard, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency } from "@/lib/formatters";

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string | null;
}

interface PlayerDetails {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  role: string;
  club_id: string | null;
}

interface PlayerEntry {
  id: string;
  entry_date: string;
  paid: boolean;
  payment_date: string | null;
  score: number | null;
  competition: {
    name: string;
    entry_fee: number;
    club: {
      name: string;
    };
  };
}

interface PlayerNote {
  id: string;
  note: string;
  created_at: string;
  created_by: string;
}

const PlayerDetailModal = ({ isOpen, onClose, playerId }: PlayerDetailModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [player, setPlayer] = useState<PlayerDetails | null>(null);
  const [entries, setEntries] = useState<PlayerEntry[]>([]);
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editedPlayer, setEditedPlayer] = useState<Partial<PlayerDetails>>({});

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerDetails();
    }
  }, [isOpen, playerId]);

  const fetchPlayerDetails = async () => {
    if (!playerId) return;
    
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
      setEditedPlayer(playerData);

      // Fetch player entries with competition details
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select(`
          id,
          entry_date,
          paid,
          payment_date,
          score,
          competitions!inner(
            name,
            entry_fee,
            clubs!inner(name)
          )
        `)
        .eq('player_id', playerId)
        .order('entry_date', { ascending: false });

      if (entriesError) {
        console.error('Error fetching entries:', entriesError);
      } else {
        const formattedEntries = (entriesData || []).map(entry => ({
          id: entry.id,
          entry_date: entry.entry_date,
          paid: entry.paid,
          payment_date: entry.payment_date,
          score: entry.score,
          competition: {
            name: (entry.competitions as any).name,
            entry_fee: (entry.competitions as any).entry_fee,
            club: {
              name: (entry.competitions as any).clubs.name
            }
          }
        }));
        setEntries(formattedEntries);
      }

      // Fetch notes (simulated for now - would need a notes table)
      setNotes([]);

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

  const handleSaveDetails = async () => {
    if (!player) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editedPlayer.first_name,
          last_name: editedPlayer.last_name,
          email: editedPlayer.email
        })
        .eq('id', player.id);

      if (error) throw error;

      setPlayer({ ...player, ...editedPlayer });
      toast({
        title: "Success",
        description: "Player details updated successfully.",
      });

    } catch (error) {
      console.error('Error updating player:', error);
      toast({
        title: "Error",
        description: "Failed to update player details.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    // For now, we'll simulate adding a note
    // In a real app, you'd have a notes table
    const mockNote: PlayerNote = {
      id: Date.now().toString(),
      note: newNote,
      created_at: new Date().toISOString(),
      created_by: 'Admin'
    };

    setNotes([mockNote, ...notes]);
    setNewNote("");
    
    toast({
      title: "Note Added",
      description: "Note has been saved successfully.",
    });
  };

  const markEntryAsPaid = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('entries')
        .update({
          paid: true,
          payment_date: new Date().toISOString()
        })
        .eq('id', entryId);

      if (error) throw error;

      // Update local state
      setEntries(entries.map(entry => 
        entry.id === entryId 
          ? { ...entry, paid: true, payment_date: new Date().toISOString() }
          : entry
      ));

      toast({
        title: "Payment Recorded",
        description: "Entry marked as paid successfully.",
      });

    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive"
      });
    }
  };

  if (!playerId) return null;

  const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unnamed Player' : 'Loading...';
  const totalEntries = entries.length;
  const totalRevenue = entries.filter(e => e.paid).reduce((sum, e) => sum + e.competition.entry_fee, 0);
  const unpaidEntries = entries.filter(e => !e.paid);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {playerName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ) : (
          <Tabs defaultValue="details" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="entries">Entries ({totalEntries})</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{totalEntries}</div>
                      <div className="text-sm text-muted-foreground">Total Entries</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{unpaidEntries.length}</div>
                      <div className="text-sm text-muted-foreground">Unpaid Entries</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Player Information</CardTitle>
                    <CardDescription>Update player details and account information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={editedPlayer.first_name || ''}
                          onChange={(e) => setEditedPlayer(prev => ({ ...prev, first_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={editedPlayer.last_name || ''}
                          onChange={(e) => setEditedPlayer(prev => ({ ...prev, last_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedPlayer.email || ''}
                        onChange={(e) => setEditedPlayer(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Registration Date</Label>
                        <div className="text-sm text-muted-foreground">
                          {player && formatDate(player.created_at, 'long')}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Status</Label>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>

                    <Button onClick={handleSaveDetails} disabled={saving} className="gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="entries" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Competition Entries</CardTitle>
                    <CardDescription>All competitions this player has entered</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {entries.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No entries found</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Competition</TableHead>
                            <TableHead>Club</TableHead>
                            <TableHead>Entry Date</TableHead>
                            <TableHead>Fee</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium">{entry.competition.name}</TableCell>
                              <TableCell>{entry.competition.club.name}</TableCell>
                              <TableCell>{formatDate(entry.entry_date, 'short')}</TableCell>
                              <TableCell>{formatCurrency(entry.competition.entry_fee)}</TableCell>
                              <TableCell>{entry.score || 'Not played'}</TableCell>
                              <TableCell>
                                <Badge variant={entry.paid ? "default" : "destructive"}>
                                  {entry.paid ? 'Paid' : 'Unpaid'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Management</CardTitle>
                    <CardDescription>Track and manage entry fee payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {unpaidEntries.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">All entries are paid up to date</p>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-medium text-destructive">Outstanding Payments ({unpaidEntries.length})</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Competition</TableHead>
                              <TableHead>Entry Date</TableHead>
                              <TableHead>Amount Due</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unpaidEntries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">{entry.competition.name}</TableCell>
                                <TableCell>{formatDate(entry.entry_date, 'short')}</TableCell>
                                <TableCell className="font-medium text-destructive">
                                  {formatCurrency(entry.competition.entry_fee)}
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    size="sm" 
                                    onClick={() => markEntryAsPaid(entry.id)}
                                    className="gap-2"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    Mark as Paid
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Player Notes</CardTitle>
                    <CardDescription>Add internal notes and comments about this player</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newNote">Add New Note</Label>
                      <Textarea
                        id="newNote"
                        placeholder="Enter note about this player..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                      />
                      <Button onClick={handleAddNote} disabled={!newNote.trim()} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Note
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Previous Notes</h4>
                      {notes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No notes added yet</p>
                      ) : (
                        notes.map((note) => (
                          <Card key={note.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{note.created_by}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(note.created_at, 'short')}
                                </span>
                              </div>
                              <p className="text-sm">{note.note}</p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDetailModal;