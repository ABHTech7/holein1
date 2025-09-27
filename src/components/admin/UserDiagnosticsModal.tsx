import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UserDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export default function UserDiagnosticsModal({ isOpen, onClose, initialEmail = '' }: UserDiagnosticsModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN' | 'CLUB' | 'INSURANCE_PARTNER'>('ADMIN');

  const reset = () => {
    setResult(null);
    setFirstName('');
    setLastName('');
    setRole('ADMIN');
  };

  const findUser = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-find-user', {
        body: { email }
      });
      if (error) throw error;
      setResult(data);
      const diag = data?.diagnostics;
      if (diag?.existsInAuth) {
        setFirstName(diag?.first_name || '');
        setLastName(diag?.last_name || '');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Lookup failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const repair = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-find-user', {
        body: { email, repair: true, defaultRole: role, firstName, lastName }
      });
      if (error) throw error;
      setResult(data);
      if (data?.success) {
        toast({ title: 'Success', description: data?.actionTaken ? `Action: ${data.actionTaken}` : 'No action needed' });
      } else {
        toast({ title: 'Failed', description: data?.error || 'Repair failed', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Repair failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>User Diagnostics</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="diag-email">Email</Label>
            <div className="flex gap-2">
              <Input id="diag-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              <Button onClick={findUser} disabled={loading || !email} className="bg-gradient-primary text-primary-foreground">Find</Button>
            </div>
          </div>

          {result && (
            <div className="rounded-md border p-3 text-sm">
              <p><strong>Exists in auth:</strong> {String(result?.diagnostics?.existsInAuth)}</p>
              <p><strong>Exists in profiles:</strong> {String(result?.diagnostics?.existsInProfiles)}</p>
              {result?.diagnostics?.profileStatus && (
                <p><strong>Profile status:</strong> {result.diagnostics.profileStatus}</p>
              )}
              {result?.diagnostics?.profileRole && (
                <p><strong>Profile role:</strong> {result.diagnostics.profileRole}</p>
              )}
              <p><strong>Recommended:</strong> {result?.diagnostics?.recommendedAction}</p>
            </div>
          )}

          {(result?.diagnostics?.recommendedAction === 'create_profile' || result?.diagnostics?.recommendedAction === 'reactivate_profile') && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="CLUB">Club Manager</SelectItem>
                    <SelectItem value="INSURANCE_PARTNER">Insurance Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset} className="flex-1">Reset</Button>
                <Button onClick={repair} disabled={loading} className="flex-1 bg-gradient-primary text-primary-foreground">Repair</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}