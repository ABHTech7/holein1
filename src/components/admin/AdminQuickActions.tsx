import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  AlertTriangle, 
  PoundSterling, 
  FileText, 
  Building, 
  TrendingUp,
  Clock,
  CheckCircle
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
}

const AdminQuickActions = ({ stats }: QuickActionsProps) => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Entry Management",
      description: "Monitor all competition entries",
      icon: Trophy,
      path: "/dashboard/admin/entries",
      count: stats.pendingEntries,
      countLabel: "Pending",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Claims Review",
      description: "Review hole-in-one claims",
      icon: AlertTriangle,
      path: "/dashboard/admin/claims",
      count: stats.pendingClaims,
      countLabel: "Awaiting",
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
      iconColor: "text-orange-600"
    },
    {
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
      title: "Club Management",
      description: "Oversee partner clubs",
      icon: Building,
      path: "/dashboard/admin/clubs",
      count: stats.totalClubs,
      countLabel: "Partners",
      color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
      iconColor: "text-indigo-600"
    }
  ];

  const formatCount = (count: number, isAmount: boolean = false) => {
    if (isAmount) {
      return `£${(count / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return count.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        
        return (
          <Card 
            key={action.path}
            className={`${action.color} cursor-pointer transition-all duration-200 hover:shadow-md border`}
            onClick={() => {
              console.log('Quick action clicked:', action.title, action.path);
              navigate(action.path);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white/60 ${action.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900">{action.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                  </div>
                </div>
                
                {action.count > 0 && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCount(action.count, action.isAmount)}
                    </div>
                    <div className="text-xs text-gray-600">{action.countLabel}</div>
                  </div>
                )}
              </div>
              
              {/* Priority indicators */}
              {action.path.includes('claims') && action.count > 0 && (
                <div className="mt-3">
                  <Badge variant="destructive" className="text-xs">
                    Needs Attention
                  </Badge>
                </div>
              )}
              
              {action.path.includes('entries') && action.count > 0 && (
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {action.count} Awaiting Payment
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