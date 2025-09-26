import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, AlertTriangle } from "lucide-react";

interface UserEmailChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
  };
  onEmailUpdated: () => void;
}

export const UserEmailChangeModal = ({
  isOpen,
  onClose,
  user,
  onEmailUpdated,
}: UserEmailChangeModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a new email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmEmailChange = async () => {
    setLoading(true);
    setShowConfirmDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('update-user-email', {
        body: {
          userId: user.id,
          newEmail: newEmail.trim().toLowerCase()
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update email');

      toast({
        title: "Email Updated",
        description: `User email changed from ${user.email} to ${newEmail}`,
      });

      onEmailUpdated();
      onClose();
      setNewEmail("");
    } catch (error: any) {
      console.error('Error updating user email:', error);
      toast({
        title: "Email Update Failed",
        description: error.message || "Failed to update user email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Change User Email
            </DialogTitle>
            <DialogDescription>
              Change the email address for {user.first_name} {user.last_name} ({user.role})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_email">Current Email</Label>
              <Input
                id="current_email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_email">New Email Address</Label>
              <Input
                id="new_email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                required
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Important:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• This will immediately change the user's login email</li>
                    <li>• The user will need to use the new email to sign in</li>
                    <li>• This action cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Change Email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Email Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {user.first_name} {user.last_name}'s email from{" "}
              <span className="font-medium">{user.email}</span> to{" "}
              <span className="font-medium">{newEmail}</span>?
              <br /><br />
              This action cannot be undone and the user will need to use the new email to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEmailChange} disabled={loading}>
              {loading ? "Updating..." : "Confirm Change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};