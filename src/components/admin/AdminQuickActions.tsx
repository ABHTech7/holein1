import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import NotificationBadge from "@/components/ui/notification-badge";
import { 
  Trophy, 
  Users, 
  AlertTriangle, 
  PoundSterling, 
  FileText, 
  Building, 
  TrendingUp,
  Clock,
  CheckCircle,
  UserPlus,
  GripVertical,
  Move
} from "lucide-react";

interface QuickActionsProps {
  stats: {
    totalPlayers: number;
    pendingEntries: number;
    pendingClaims: number;
    monthlyRevenue: number;
    activeCompetitions: number;
    totalClubs: number;
  };
  insurancePremiums?: {
    monthToDate: number;
    currentRate: number;
  };
  onAddUser?: () => void;
  isEditing?: boolean;
}

const AdminQuickActions = ({ stats, insurancePremiums, onAddUser, isEditing = false }: QuickActionsProps) => {
  const navigate = useNavigate();
  const { newLeads, pendingClaims } = useNotificationCounts();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [actionOrder, setActionOrder] = useState<string[]>(() => {
    // Load saved order from localStorage, fallback to default order
    const saved = localStorage.getItem('admin-quick-actions-order');
    return saved ? JSON.parse(saved) : [
      'players', 'revenue', 'competitions', 'clubs', 'entries', 'claims', 'users', 'insurance', 'enquiries'
    ];
  });

  const actions = [
    {
      id: "players",
      title: "Player Management",
      description: "View and manage all players",
      icon: Users,
      path: "/dashboard/admin/players",
      count: stats.totalPlayers,
      countLabel: "Total",
      color: "bg-green-50 border-green-200 hover:bg-green-100",
      iconColor: "text-green-600"
    },
    {
      id: "revenue",
      title: "Revenue Overview",
      description: "Financial analytics and reports",
      icon: PoundSterling,
      path: "/dashboard/admin/revenue",
      count: stats.monthlyRevenue,
      countLabel: "This Month",
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
      iconColor: "text-purple-600",
      isAmount: true
    },
    {
      id: "competitions",
      title: "Competitions",
      description: "Manage active competitions",
      icon: Trophy,
      path: "/dashboard/admin/competitions",
      count: stats.activeCompetitions,
      countLabel: "Active",
      color: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
      iconColor: "text-yellow-600"
    },
    {
      id: "clubs",
      title: "Club Management",
      description: "Oversee partner clubs",
      icon: Building,
      path: "/dashboard/admin/clubs",
      count: stats.totalClubs,
      countLabel: "Partners",
      color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
      iconColor: "text-indigo-600"
    },
    {
      id: "entries",
      title: "Entry Management",
      description: "Monitor and manage entries",
      icon: Clock,
      path: "/dashboard/admin/entries",
      count: stats.pendingEntries,
      countLabel: "Month to Date",
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
      iconColor: "text-orange-600"
    },
    {
      id: "claims",
      title: "Claims Review",
      description: "Review pending win claims",
      icon: CheckCircle,
      path: "/dashboard/admin/claims",
      count: pendingClaims,
      countLabel: "Pending",
      color: "bg-red-50 border-red-200 hover:bg-red-100",
      iconColor: "text-red-600",
      hasNotification: pendingClaims > 0
    },
    {
      id: "users",
      title: "User Management",
      description: "Manage all platform users",
      icon: Users,
      path: "/dashboard/admin/users",
      color: "bg-teal-50 border-teal-200 hover:bg-teal-100",
      iconColor: "text-teal-600",
      hasSubAction: true,
      subActionText: "Add User",
      subActionPath: "/dashboard/admin/users/new"
    },
    {
      id: "insurance",
      title: "Insurance Premiums", 
      description: "Manage insurance partners and premiums",
      icon: FileText,
      path: "/dashboard/admin/insurance",
      count: insurancePremiums?.monthToDate ? Math.round(insurancePremiums.monthToDate * 100) : undefined,
      countLabel: "MTD Premium",
      color: "bg-slate-50 border-slate-200 hover:bg-slate-100",
      iconColor: "text-slate-600",
      isAmount: true
    },
    {
      id: "enquiries", 
      title: "Partnership Enquiries",
      description: "Review club partnership requests",
      icon: FileText,
      path: "/dashboard/admin/enquiries",
      count: newLeads,
      countLabel: "New",
      color: "bg-pink-50 border-pink-200 hover:bg-pink-100",
      iconColor: "text-pink-600",
      hasNotification: newLeads > 0
    }
  ];

  // Save order to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('admin-quick-actions-order', JSON.stringify(actionOrder));
  }, [actionOrder]);

  // Create ordered actions based on current order
  const orderedActions = actionOrder
    .map(id => actions.find(action => action.id === id))
    .filter(Boolean) as typeof actions;

  // Add any new actions that aren't in the saved order
  const newActions = actions.filter(action => !actionOrder.includes(action.id));
  const allOrderedActions = [...orderedActions, ...newActions];

  // Update actionOrder to include any new actions
  useEffect(() => {
    const newActionIds = newActions.map(action => action.id);
    if (newActionIds.length > 0) {
      setActionOrder(prev => [...prev, ...newActionIds]);
    }
  }, [newActions.length]);

  const moveAction = (fromIndex: number, toIndex: number) => {
    if (!isEditing) return;
    
    // Work with the complete actions array to get proper IDs
    const reorderedActions = [...allOrderedActions];
    const [movedAction] = reorderedActions.splice(fromIndex, 1);
    reorderedActions.splice(toIndex, 0, movedAction);
    
    // Update the actionOrder state with the new order of IDs
    const newOrder = reorderedActions.map(action => action.id);
    setActionOrder(newOrder);
  };

  const formatCount = (count: number, isAmount: boolean = false) => {
    if (isAmount) {
      return `£${(count / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return count.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {allOrderedActions.map((action, index) => {
        const Icon = action.icon;
        
        return (
          <Card 
            key={action.id}
            className={`${action.color} ${isEditing ? 'cursor-move' : 'cursor-pointer'} transition-all duration-200 hover:shadow-md border ${isEditing ? 'ring-2 ring-primary/20' : ''} relative ${
              draggedIndex === index ? 'opacity-50 scale-95' : ''
            } ${isEditing && draggedIndex !== null && draggedIndex !== index ? 'border-dashed border-2 border-primary/40' : ''}`}
            onClick={() => {
              if (!isEditing) {
                console.log('Quick action clicked:', action.title, action.path);
                navigate(action.path);
              }
            }}
            draggable={isEditing}
            onDragStart={(e) => {
              if (isEditing) {
                setDraggedIndex(index);
                e.dataTransfer.setData('text/plain', index.toString());
                e.dataTransfer.effectAllowed = 'move';
              }
            }}
            onDragEnd={() => {
              setDraggedIndex(null);
            }}
            onDragOver={(e) => {
              if (isEditing) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(e) => {
              if (isEditing) {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                if (fromIndex !== index) {
                  moveAction(fromIndex, index);
                }
                setDraggedIndex(null);
              }
            }}
          >
            {action.hasNotification && (
              <NotificationBadge 
                count={action.count || 0}
                variant={action.count && action.count > 5 ? 'urgent' : 'default'}
              />
            )}
            <CardContent className="p-4">
              {isEditing && (
                <div className="flex justify-center mb-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white/60 ${action.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900">{action.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                    {action.hasSubAction && !isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 text-xs h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddUser) {
                            onAddUser();
                          } else {
                            navigate('/dashboard/admin/users');
                          }
                        }}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        {action.subActionText}
                      </Button>
                    )}
                  </div>
                </div>
                
                {(action.count ?? 0) > 0 && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCount(action.count!, action.isAmount)}
                    </div>
                    <div className="text-xs text-gray-600">{action.countLabel}</div>
                  </div>
                )}
              </div>
              
              {/* Priority indicators - only show when not editing */}
              {!isEditing && action.id === 'claims' && (action.count ?? 0) > 0 && (
                <div className="mt-3">
                  <Badge variant="destructive" className="text-xs">
                    Needs Attention
                  </Badge>
                </div>
              )}
              
              {!isEditing && action.id === 'enquiries' && (action.count ?? 0) > 0 && (
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    New Partnerships
                  </Badge>
                </div>
              )}
              
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminQuickActions;