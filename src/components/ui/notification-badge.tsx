import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  variant?: 'default' | 'urgent';
  className?: string;
}

const NotificationBadge = ({ count, variant = 'default', className }: NotificationBadgeProps) => {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full flex items-center justify-center text-xs font-bold text-white",
        variant === 'urgent' && count > 5 
          ? "bg-destructive animate-pulse shadow-lg" 
          : "bg-primary",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
};

export default NotificationBadge;