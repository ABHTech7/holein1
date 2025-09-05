import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { PoundSterling, Plus, Calendar, TrendingUp, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { trackPaymentAction } from "@/lib/auditTracker";

interface CommissionSectionProps {
  clubId: string;
}

interface CommissionStats {
  monthToDate: number;
  yearToDate: number;
  totalCommission: number;
  unpaidCommission: number;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_reference: string | null;
  period_start: string;
  period_end: string;
  entries_count: number;
  status: string;
  notes: string | null;
}

const ClubCommissionSection = ({ clubId }: CommissionSectionProps) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommissionStats>({
    monthToDate: 0,
    yearToDate: 0,
    totalCommission: 0,
    unpaidCommission: 0
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPayment, setNewPayment] = useState({
    amount: "",
    reference: "",
    period_start: "",
    period_end: "",
    notes: ""
  });
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentData, setEditPaymentData] = useState({
    amount: "",
    reference: "",
    period_start: "",
    period_end: "",
    notes: ""
  });

  useEffect(() => {
    fetchCommissionData();
  }, [clubId]);

  const fetchCommissionData = async () => {
    try {
      setLoading(true);

      // Fetch club's competitions and their entries to calculate commission
      const { data: competitions, error: compError } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          commission_amount,
          entries!inner(
            id,
            entry_date,
            paid
          )
        `)
        .eq('club_id', clubId);

      if (compError) throw compError;

      // Calculate commission stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      let totalCommission = 0;
      let monthToDate = 0;
      let yearToDate = 0;

      competitions?.forEach(comp => {
        const commissionAmount = parseFloat(comp.commission_amount?.toString() || '0');
        const paidEntries = comp.entries?.filter((entry: any) => entry.paid) || [];
        
        paidEntries.forEach((entry: any) => {
          const entryDate = new Date(entry.entry_date);
          const commission = commissionAmount;
          
          totalCommission += commission;
          
          if (entryDate >= startOfMonth) {
            monthToDate += commission;
          }
          
          if (entryDate >= startOfYear) {
            yearToDate += commission;
          }
        });
      });

      // Fetch payments made to this club
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('club_payments')
        .select('*')
        .eq('club_id', clubId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      const totalPaid = paymentsData?.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0) || 0;
      const unpaidCommission = totalCommission - totalPaid;

      setStats({
        monthToDate,
        yearToDate,
        totalCommission,
        unpaidCommission
      });

      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error fetching commission data:', error);
      toast({
        title: "Error",
        description: "Failed to load commission data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || !newPayment.period_start || !newPayment.period_end) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate payment amount doesn't exceed unpaid commission
    const paymentAmount = parseFloat(newPayment.amount);
    if (paymentAmount > stats.unpaidCommission) {
      toast({
        title: "Error",
        description: `Payment amount cannot exceed unpaid commission of ${formatCurrency(stats.unpaidCommission)}`,
        variant: "destructive"
      });
      return;
    }

    try {
      const paymentData = {
        club_id: clubId,
        amount: paymentAmount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_reference: newPayment.reference || null,
        period_start: newPayment.period_start,
        period_end: newPayment.period_end,
        entries_count: 0, // This would be calculated based on the period
        commission_amount: 0, // This would be the weighted average
        notes: newPayment.notes || null,
        status: 'processed',
        created_by: user?.id
      };

      const { data: insertedPayment, error } = await supabase
        .from('club_payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) throw error;

      // Track payment creation
      if (insertedPayment) {
        await trackPaymentAction(insertedPayment.id, 'create', paymentData, user?.id);
      }

      toast({
        title: "Success",
        description: "Payment recorded successfully"
      });

      setNewPayment({
        amount: "",
        reference: "",
        period_start: "",
        period_end: "",
        notes: ""
      });

      fetchCommissionData();

    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive"
      });
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setEditPaymentData({
      amount: payment.amount.toString(),
      reference: payment.payment_reference || "",
      period_start: payment.period_start,
      period_end: payment.period_end,
      notes: payment.notes || ""
    });
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment || !editPaymentData.amount || !editPaymentData.period_start || !editPaymentData.period_end) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const oldData = editingPayment;
      const newData = {
        amount: parseFloat(editPaymentData.amount),
        payment_reference: editPaymentData.reference || null,
        period_start: editPaymentData.period_start,
        period_end: editPaymentData.period_end,
        notes: editPaymentData.notes || null
      };

      const { error } = await supabase
        .from('club_payments')
        .update(newData)
        .eq('id', editingPayment.id);

      if (error) throw error;

      // Track payment update
      await trackPaymentAction(editingPayment.id, 'update', newData, user?.id, oldData);

      toast({
        title: "Success",
        description: "Payment updated successfully"
      });

      setEditingPayment(null);
      fetchCommissionData();

    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive"
      });
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    try {
      const { error } = await supabase
        .from('club_payments')
        .delete()
        .eq('id', payment.id);

      if (error) throw error;

      // Track payment deletion
      await trackPaymentAction(payment.id, 'delete', null, user?.id, payment);

      toast({
        title: "Success",
        description: "Payment deleted successfully"
      });

      fetchCommissionData();

    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive"
      });
    }
  };

  const isAdmin = profile?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Commission Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Month to Date</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.monthToDate)}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Year to Date</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.yearToDate)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Commission</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalCommission)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-orange-800">Unpaid Commission</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(stats.unpaidCommission)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Record Commission Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (£)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Payment Reference</Label>
              <Input
                id="reference"
                value={newPayment.reference}
                onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="REF123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_start">Period Start</Label>
              <Input
                id="period_start"
                type="date"
                value={newPayment.period_start}
                onChange={(e) => setNewPayment(prev => ({ ...prev, period_start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_end">Period End</Label>
              <Input
                id="period_end"
                type="date"
                value={newPayment.period_end}
                onChange={(e) => setNewPayment(prev => ({ ...prev, period_end: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Button onClick={handleAddPayment} className="w-full">
                Record Payment
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={newPayment.notes}
              onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this payment..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="w-5 h-5" />
            Commission Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    No payments recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                      </div>
                    </TableCell>
                    <TableCell>{payment.payment_reference || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        payment.status === 'processed' ? 'default' : 
                        payment.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-32 truncate" title={payment.notes || ''}>
                      {payment.notes || '-'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditPayment(payment)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Payment</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit_amount">Amount (£)</Label>
                                  <Input
                                    id="edit_amount"
                                    type="number"
                                    step="0.01"
                                    value={editPaymentData.amount}
                                    onChange={(e) => setEditPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit_reference">Reference</Label>
                                  <Input
                                    id="edit_reference"
                                    value={editPaymentData.reference}
                                    onChange={(e) => setEditPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="edit_period_start">Period Start</Label>
                                    <Input
                                      id="edit_period_start"
                                      type="date"
                                      value={editPaymentData.period_start}
                                      onChange={(e) => setEditPaymentData(prev => ({ ...prev, period_start: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit_period_end">Period End</Label>
                                    <Input
                                      id="edit_period_end"
                                      type="date"
                                      value={editPaymentData.period_end}
                                      onChange={(e) => setEditPaymentData(prev => ({ ...prev, period_end: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="edit_notes">Notes</Label>
                                  <Input
                                    id="edit_notes"
                                    value={editPaymentData.notes}
                                    onChange={(e) => setEditPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <DialogTrigger asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogTrigger>
                                  <Button onClick={handleUpdatePayment}>
                                    Update Payment
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this payment record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePayment(payment)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubCommissionSection;