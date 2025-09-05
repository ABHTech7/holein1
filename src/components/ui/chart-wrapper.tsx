import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChartWrapperProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

const ChartWrapper = ({ 
  title, 
  description, 
  children, 
  className,
  headerAction 
}: ChartWrapperProps) => {
  return (
    <Card className={cn("shadow-soft", className)}>
      {(title || description || headerAction) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            {title && (
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </CardHeader>
      )}
      <CardContent className="pt-0">
        <div className="w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartWrapper;