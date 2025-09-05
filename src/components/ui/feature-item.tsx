import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface FeatureItemProps {
  icon: LucideIcon;
  title: string;
  description: string | ReactNode;
  className?: string;
  variant?: "default" | "card" | "minimal";
}

const FeatureItem = ({ 
  icon: Icon, 
  title, 
  description, 
  className,
  variant = "default"
}: FeatureItemProps) => {
  const baseClasses = "group text-center";
  const variantClasses = {
    default: "p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300",
    card: "p-8 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300 hover:border-primary/20",
    minimal: "p-4"
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-primary-foreground" />
      </div>
      
      <h3 className="font-display text-lg font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
        {title}
      </h3>
      
      <div className="text-muted-foreground leading-relaxed">
        {typeof description === 'string' ? (
          <p>{description}</p>
        ) : (
          description
        )}
      </div>
    </div>
  );
};

export default FeatureItem;