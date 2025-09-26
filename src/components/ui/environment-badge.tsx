import { Badge } from "@/components/ui/badge";
import { getDemoModeDisplayConfig } from "@/lib/demoMode";

interface EnvironmentBadgeProps {
  className?: string;
}

export const EnvironmentBadge = ({ className }: EnvironmentBadgeProps) => {
  const { environmentBadge, showDemoIndicators } = getDemoModeDisplayConfig();

  if (!showDemoIndicators) {
    return null;
  }

  return (
    <Badge 
      variant={environmentBadge.variant} 
      className={className}
    >
      {environmentBadge.text}
    </Badge>
  );
};