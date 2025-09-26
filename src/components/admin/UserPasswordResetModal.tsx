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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Copy, Eye, EyeOff } from "lucide-react";

interface UserPasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
  };
  onPasswordReset: () => void;
}

export const UserPasswordResetModal = ({
  isOpen,
  onClose,
  user,
  onPasswordReset,
}: UserPasswordResetModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useCustomPassword && customPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Custom password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmPasswordReset = async () => {
    setLoading(true);
    setShowConfirmDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId: user.id,
          customPassword: useCustomPassword ? customPassword : undefined
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to reset password');

      setNewPassword(data.newPassword);

      toast({
        title: "Password Reset",
        description: `Password reset for ${user.first_name} ${user.last_name}`,
      });

      onPasswordReset();
    } catch (error: any) {
      console.error('Error resetting user password:', error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset user password",
        variant: "destructive",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      toast({
        title: "Password Copied",
        description: "New password copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy password to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setCustomPassword("");
    setUseCustomPassword(false);
    setShowPassword(false);
    onClose();
  };

  if (newPassword) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-green-600" />
              Password Reset Complete
            </DialogTitle>
            <DialogDescription>
              New password generated for {user.first_name} {user.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Important:</span> Share this password securely with the user. 
                They should change it on their first login.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset User Password
            </DialogTitle>
            <DialogDescription>
              Reset password for {user.first_name} {user.last_name} ({user.role})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="custom-password"
                checked={useCustomPassword}
                onCheckedChange={(checked) => setUseCustomPassword(checked === true)}
              />
              <Label htmlFor="custom-password">Set custom password</Label>
            </div>

            {useCustomPassword && (
              <div className="space-y-2">
                <Label htmlFor="custom_password">Custom Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="custom_password"
                    type={showPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Enter custom password (min 8 chars)"
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Note:</span>{" "}
                {useCustomPassword 
                  ? "The custom password will be set for this user."
                  : "A secure random password will be generated automatically."
                }
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Reset Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Password Reset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for {user.first_name} {user.last_name}?
              <br /><br />
              This will immediately change their password and they will need the new password to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPasswordReset} disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};