import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { UserEmailChangeModal } from "./UserEmailChangeModal";
import { UserPasswordResetModal } from "./UserPasswordResetModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MoreHorizontal, Mail, KeyRound, Settings, Trash2 } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

interface EnhancedUserManagementProps {
  user: UserProfile;
  onUserUpdated: () => void;
  onUserDeleted: () => void;
  onManagePermissions: () => void;
}

export const EnhancedUserManagement = ({
  user,
  onUserUpdated,
  onUserDeleted,
  onManagePermissions,
}: EnhancedUserManagementProps) => {
  const { toast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_admin_user', {
        p_user_id: user.id,
        p_reason: 'Manual deletion via admin interface'
      });

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: `${user.first_name} ${user.last_name} has been deleted successfully.`,
      });

      onUserDeleted();
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEmailModal(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Change Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowPasswordModal(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onManagePermissions}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Permissions
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserEmailChangeModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        user={user}
        onEmailUpdated={onUserUpdated}
      />

      <UserPasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        user={user}
        onPasswordReset={() => {}}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {user.first_name} {user.last_name}?
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};