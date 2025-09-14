import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { getConfig } from "@/lib/featureFlags";

interface EnterNowCTAProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  entryFee: number;
}

export const EnterNowCTA = ({ onClick, disabled, loading, entryFee }: EnterNowCTAProps) => {
  const { verificationTimeoutHours } = getConfig();
  
  return (
    <div className="space-y-4">
      <Button
        onClick={onClick}
        disabled={disabled || loading}
        size="lg"
        className="w-full h-14 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5" />
            <span>Enter Now - £{(entryFee / 100).toFixed(2)}</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        )}
      </Button>
      
      <p className="text-center text-sm text-muted-foreground">
        Secure payment • Instant confirmation • {verificationTimeoutHours}-hour verification window
      </p>
    </div>
  );
};