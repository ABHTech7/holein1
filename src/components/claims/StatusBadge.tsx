import { Badge } from "@/components/ui/badge";
import { Clock, Eye, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { VerificationStatus } from "@/types/claims";

interface StatusBadgeProps {
  status: VerificationStatus;
  showIcon?: boolean;
}

const statusConfig = {
  initiated: {
    label: "Initiated",
    variant: "secondary" as const,
    icon: Clock,
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
  },
  pending: {
    label: "Pending", 
    variant: "secondary" as const,
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
  },
  under_review: {
    label: "Under Review",
    variant: "outline" as const, 
    icon: Eye,
    className: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
  },
  verified: {
    label: "Verified",
    variant: "default" as const,
    icon: CheckCircle,
    className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
  },
  rejected: {
    label: "Rejected", 
    variant: "destructive" as const,
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
  }
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: "Unknown",
    variant: "outline" as const,
    icon: AlertTriangle,
    className: ""
  };

  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`inline-flex items-center gap-1 w-fit ${config.className}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}