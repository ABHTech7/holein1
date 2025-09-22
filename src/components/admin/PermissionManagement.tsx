import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield, Users, Settings } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted_at: string;
  granted_by: string;
}

interface PermissionManagementProps {
  userId: string;
  userEmail: string;
  onClose: () => void;
}

const CATEGORY_ICONS = {
  user_management: Users,
  club_management: Shield,
  competition_management: Settings,
  financial: Settings,
  claims_management: Shield,
  entry_management: Settings,
  system: Settings,
  analytics: Settings,
  security: Shield,
} as const;

const CATEGORY_COLORS = {
  user_management: 'bg-blue-100 text-blue-800',
  club_management: 'bg-green-100 text-green-800',
  competition_management: 'bg-purple-100 text-purple-800',
  financial: 'bg-orange-100 text-orange-800',
  claims_management: 'bg-red-100 text-red-800',
  entry_management: 'bg-indigo-100 text-indigo-800',
  system: 'bg-gray-100 text-gray-800',
  analytics: 'bg-yellow-100 text-yellow-800',
  security: 'bg-pink-100 text-pink-800',
} as const;

export const PermissionManagement: React.FC<PermissionManagementProps> = ({ 
  userId, 
  userEmail, 
  onClose 
}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPermissions();
    fetchUserPermissions();
  }, [userId]);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive"
      });
    }
  };

  const fetchUserPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_user_permissions')
        .select('permission_id')
        .eq('user_id', userId);

      if (error) throw error;
      setUserPermissions(data?.map(p => p.permission_id) || []);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (permissionId: string, granted: boolean) => {
    try {
      if (granted) {
        // Grant permission
        const { error } = await supabase
          .from('admin_user_permissions')
          .insert({
            user_id: userId,
            permission_id: permissionId,
            granted_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
        setUserPermissions(prev => [...prev, permissionId]);
      } else {
        // Revoke permission
        const { error } = await supabase
          .from('admin_user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_id', permissionId);

        if (error) throw error;
        setUserPermissions(prev => prev.filter(id => id !== permissionId));
      }

      toast({
        title: "Success",
        description: granted ? "Permission granted" : "Permission revoked",
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive"
      });
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Manage Permissions</h3>
        <p className="text-sm text-muted-foreground">
          Configure permissions for {userEmail}
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
          const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Settings;
          const colorClass = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-100 text-gray-800';

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5" />
                  <Badge variant="secondary" className={colorClass}>
                    {category.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryPermissions.map((permission) => (
                  <div key={permission.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <Checkbox
                      id={permission.id}
                      checked={userPermissions.includes(permission.id)}
                      onCheckedChange={(checked) => 
                        togglePermission(permission.id, !!checked)
                      }
                      disabled={saving}
                    />
                    <div className="flex-1 space-y-1">
                      <label 
                        htmlFor={permission.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {permission.name.replace('_', ' ')}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};