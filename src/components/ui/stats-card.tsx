import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

const StatsCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  className,
  onClick
}: StatsCardProps) => {
  const CardComponent = onClick ? "button" : "div";
  
  return (
    <Card className={cn("relative overflow-hidden transition-all duration-200", onClick && "cursor-pointer hover:shadow-md", className)}>
      <CardContent className="p-6">
        <CardComponent
          onClick={onClick}
          className={cn(
            "w-full text-left",
            onClick && "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-sm"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            {Icon && (
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-3xl font-bold text-foreground">{value}</p>
            
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            
            {trend && (
              <div className="flex items-center space-x-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend.isPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
                <span className="text-sm text-muted-foreground">from last period</span>
              </div>
            )}
          </div>
        </CardComponent>
      </CardContent>
    </Card>
  );
};

export default StatsCard;