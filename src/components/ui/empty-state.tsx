import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string | ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className,
  size = "md"
}: EmptyStateProps) => {
  const sizeClasses = {
    sm: "py-8 px-4",
    md: "py-12 px-6", 
    lg: "py-16 px-8"
  };

  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center", 
      sizeClasses[size],
      className
    )}>
      {Icon && (
        <div className="mb-4 p-3 bg-muted/50 rounded-full">
          <Icon className={cn("text-muted-foreground", iconSizes[size])} />
        </div>
      )}
      
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      {description && (
        <div className="text-muted-foreground mb-6 max-w-md">
          {typeof description === 'string' ? (
            <p>{description}</p>
          ) : (
            description
          )}
        </div>
      )}
      
      {action && (
        <Button 
          onClick={action.onClick}
          className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;