import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { MoreHorizontal, Mail, KeyRound, Settings, Trash2, UserX, UserCheck, Power, PowerOff } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB' | 'PLAYER' | 'INSURANCE_PARTNER';
  status?: string;
  club_id?: string;
}

interface EnhancedUserManagementProps {
  user: UserProfile;
  onUserUpdated: () => void;
  onUserDeleted: () => void;
  onManagePermissions: () => void;
  currentUserRole?: string;
}

export const EnhancedUserManagement = ({
  user,
  onUserUpdated,
  onUserDeleted,
  onManagePermissions,
  currentUserRole = 'ADMIN',
}: EnhancedUserManagementProps) => {
  const { toast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggledStatus, setToggledStatus] = useState(false);

  const isActive = user.status === 'active' || !user.status;
  const canDelete = currentUserRole === 'SUPER_ADMIN';
  const canToggleStatus = currentUserRole === 'SUPER_ADMIN' || (currentUserRole === 'ADMIN' && user.role !== 'SUPER_ADMIN');
  const canChangeEmail = currentUserRole === 'SUPER_ADMIN';

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      let result;
      
      if (user.role === 'PLAYER') {
        result = await supabase.rpc('admin_delete_player', {
          p_player_id: user.id,
          p_reason: 'Manual deletion via admin interface'
        });
      } else {
        result = await supabase.rpc('admin_delete_admin_user', {
          p_user_id: user.id,
          p_reason: 'Manual deletion via admin interface'
        });
      }

      if (result.error) throw result.error;

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

  const handleToggleStatus = async () => {
    setToggledStatus(true);
    try {
      const newStatus = !isActive;
      const { error } = await supabase.rpc('admin_toggle_user_status', {
        p_user_id: user.id,
        p_active: newStatus,
        p_reason: `Status changed via admin interface`
      });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `User has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });

      onUserUpdated();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Status Update Failed",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setToggledStatus(false);
    }
  };

  const getUserDisplayName = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email;
  };

  const getDeleteConfirmationMessage = () => {
    const displayName = getUserDisplayName();
    if (user.role === 'PLAYER') {
      return `Are you sure you want to delete ${displayName}? This will permanently remove the player and ALL their entries, verifications, claims, and uploaded files. This action cannot be undone.`;
    } else if (user.role === 'CLUB') {
      return `Are you sure you want to delete ${displayName}? This will archive their club and remove their access. This action cannot be undone.`;
    } else {
      return `Are you sure you want to delete ${displayName}? This will remove their admin access and permissions. This action cannot be undone.`;
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Status Badge */}
        <Badge 
          variant={isActive ? "secondary" : "destructive"}
          className="gap-1"
        >
          {isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
          {isActive ? 'Active' : 'Inactive'}
        </Badge>

        {/* Status Toggle Switch (for eligible users) */}
        {canToggleStatus && (
          <div className="flex items-center gap-1">
            <Switch
              checked={isActive}
              onCheckedChange={handleToggleStatus}
              disabled={toggledStatus}
            />
          </div>
        )}

        {/* Actions Menu */}
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
            
            {canChangeEmail && (
              <DropdownMenuItem onClick={() => setShowEmailModal(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Change Email
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={() => setShowPasswordModal(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Password
            </DropdownMenuItem>
            
            {user.role === 'ADMIN' && (
              <DropdownMenuItem onClick={onManagePermissions}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Permissions
              </DropdownMenuItem>
            )}
            
            {canToggleStatus && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleToggleStatus}
                  disabled={toggledStatus}
                >
                  {isActive ? (
                    <>
                      <PowerOff className="mr-2 h-4 w-4" />
                      Deactivate User
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 h-4 w-4" />
                      Activate User
                    </>
                  )}
                </DropdownMenuItem>
              </>
            )}
            
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Email Change Modal */}
      {canChangeEmail && (
        <UserEmailChangeModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          user={user}
          onEmailUpdated={onUserUpdated}
        />
      )}

      {/* Password Reset Modal */}
      <UserPasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        user={user}
        onPasswordReset={onUserUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {getDeleteConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};