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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Building, Mail, Phone, MapPin, Trophy, FileText, PoundSterling, Plus, Save, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency } from "@/lib/formatters";

interface ClubDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string | null;
}

interface ClubDetails {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
  created_at: string;
}

interface ClubCompetition {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  entry_fee: number;
  max_participants: number | null;
  entries_count: number;
  total_revenue: number;
}

interface ClubPayment {
  id: string;
  amount: number;
  description: string;
  payment_date: string;
  payment_type: string;
}

interface ClubNote {
  id: string;
  note: string;
  created_at: string;
  created_by: string;
}

const ClubDetailModal = ({ isOpen, onClose, clubId }: ClubDetailModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<ClubDetails | null>(null);
  const [competitions, setCompetitions] = useState<ClubCompetition[]>([]);
  const [payments, setPayments] = useState<ClubPayment[]>([]);
  const [notes, setNotes] = useState<ClubNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editedClub, setEditedClub] = useState<Partial<ClubDetails>>({});
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
    payment_type: 'Revenue Share'
  });

  useEffect(() => {
    if (isOpen && clubId) {
      fetchClubDetails();
    }
  }, [isOpen, clubId]);

  const fetchClubDetails = async () => {
    if (!clubId) return;
    
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
      setEditedClub(clubData);

      // Fetch club competitions with entry counts
      const { data: competitionsData, error: competitionsError } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          description,
          start_date,
          end_date,
          status,
          entry_fee,
          max_participants,
          entries(id, paid)
        `)
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });

      if (competitionsError) {
        console.error('Error fetching competitions:', competitionsError);
      } else {
        const formattedCompetitions = (competitionsData || []).map(comp => {
          const entries = (comp.entries as any[]) || [];
          const paidEntries = entries.filter(e => e.paid);
          return {
            id: comp.id,
            name: comp.name,
            description: comp.description,
            start_date: comp.start_date,
            end_date: comp.end_date,
            status: comp.status,
            entry_fee: comp.entry_fee,
            max_participants: comp.max_participants,
            entries_count: entries.length,
            total_revenue: paidEntries.length * comp.entry_fee
          };
        });
        setCompetitions(formattedCompetitions);
      }

      // Initialize mock payments and notes
      setPayments([]);
      setNotes([]);

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

  const handleSaveDetails = async () => {
    if (!club) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('clubs')
        .update({
          name: editedClub.name,
          address: editedClub.address,
          email: editedClub.email,
          phone: editedClub.phone,
          website: editedClub.website,
          active: editedClub.active
        })
        .eq('id', club.id);

      if (error) throw error;

      setClub({ ...club, ...editedClub });
      toast({
        title: "Success",
        description: "Club details updated successfully.",
      });

    } catch (error) {
      console.error('Error updating club:', error);
      toast({
        title: "Error",
        description: "Failed to update club details.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const mockNote: ClubNote = {
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

  const handleAddPayment = async () => {
    if (!newPayment.amount || !newPayment.description) {
      toast({
        title: "Error",
        description: "Please fill in all payment fields.",
        variant: "destructive"
      });
      return;
    }

    const mockPayment: ClubPayment = {
      id: Date.now().toString(),
      amount: parseFloat(newPayment.amount),
      description: newPayment.description,
      payment_date: new Date().toISOString(),
      payment_type: newPayment.payment_type
    };

    setPayments([mockPayment, ...payments]);
    setNewPayment({ amount: '', description: '', payment_type: 'Revenue Share' });
    
    toast({
      title: "Payment Recorded",
      description: "Payment has been added successfully.",
    });
  };

  if (!clubId) return null;

  const clubName = club?.name || 'Loading...';
  const totalCompetitions = competitions.length;
  const activeCompetitions = competitions.filter(c => c.status === 'ACTIVE').length;
  const totalRevenue = competitions.reduce((sum, comp) => sum + comp.total_revenue, 0);
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            {clubName}
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="competitions">Competitions</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{totalCompetitions}</div>
                      <div className="text-sm text-muted-foreground">Total Competitions</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{activeCompetitions}</div>
                      <div className="text-sm text-muted-foreground">Active Now</div>
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
                      <div className="text-2xl font-bold">{formatCurrency(totalPayments)}</div>
                      <div className="text-sm text-muted-foreground">Payments Made</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Club Information</CardTitle>
                    <CardDescription>Update club details and contact information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clubName">Club Name</Label>
                        <Input
                          id="clubName"
                          value={editedClub.name || ''}
                          onChange={(e) => setEditedClub(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={editedClub.website || ''}
                          onChange={(e) => setEditedClub(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={editedClub.address || ''}
                        onChange={(e) => setEditedClub(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Full club address including postcode"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editedClub.email || ''}
                          onChange={(e) => setEditedClub(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={editedClub.phone || ''}
                          onChange={(e) => setEditedClub(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label htmlFor="active">Club Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Active clubs can create competitions and accept entries
                        </p>
                      </div>
                      <Switch
                        id="active"
                        checked={editedClub.active ?? true}
                        onCheckedChange={(checked) => setEditedClub(prev => ({ ...prev, active: checked }))}
                      />
                    </div>

                    <Button onClick={handleSaveDetails} disabled={saving} className="gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="competitions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Club Competitions</span>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Competition
                      </Button>
                    </CardTitle>
                    <CardDescription>Manage competitions for this club</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {competitions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No competitions found</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Competition Name</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Entry Fee</TableHead>
                            <TableHead>Entries</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {competitions.map((competition) => (
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
                                <Badge variant="secondary">
                                  {competition.entries_count}
                                  {competition.max_participants && ` / ${competition.max_participants}`}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{formatCurrency(competition.total_revenue)}</TableCell>
                              <TableCell>
                                <Badge variant={competition.status === "ACTIVE" ? "default" : "secondary"}>
                                  {competition.status}
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
                    <CardDescription>Track payments made to this club</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="paymentAmount">Amount (£)</Label>
                        <Input
                          id="paymentAmount"
                          type="number"
                          step="0.01"
                          value={newPayment.amount}
                          onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentType">Payment Type</Label>
                        <select 
                          className="w-full p-2 border rounded-md"
                          value={newPayment.payment_type}
                          onChange={(e) => setNewPayment(prev => ({ ...prev, payment_type: e.target.value }))}
                        >
                          <option value="Revenue Share">Revenue Share</option>
                          <option value="Commission">Commission</option>
                          <option value="Bonus">Bonus</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentDescription">Description</Label>
                        <Input
                          id="paymentDescription"
                          value={newPayment.description}
                          onChange={(e) => setNewPayment(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Payment description"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddPayment} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Record Payment
                    </Button>

                    <div className="space-y-3">
                      <h4 className="font-medium">Payment History</h4>
                      {payments.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">No payments recorded yet</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatDate(payment.payment_date, 'short')}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{payment.payment_type}</Badge>
                                </TableCell>
                                <TableCell>{payment.description}</TableCell>
                                <TableCell className="font-medium text-green-600">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Club Notes</CardTitle>
                    <CardDescription>Add internal notes and comments about this club</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newNote">Add New Note</Label>
                      <Textarea
                        id="newNote"
                        placeholder="Enter note about this club..."
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

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Club Settings</CardTitle>
                    <CardDescription>Advanced settings and configurations for this club</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label>Enable Online Registration</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow players to register for competitions online
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label>Require Payment on Entry</Label>
                          <p className="text-sm text-muted-foreground">
                            Players must pay entry fees when registering
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send club managers email updates about entries and payments
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
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

export default ClubDetailModal;