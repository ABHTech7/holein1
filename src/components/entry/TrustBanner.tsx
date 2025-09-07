import { Shield, Video, CheckCircle } from "lucide-react";

export const TrustBanner = () => {
  return (
    <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4">
      <div className="flex items-center justify-center gap-6 text-sm font-medium text-secondary-foreground">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-secondary" />
          <span>Insurer-backed</span>
        </div>
        
        <div className="h-4 w-px bg-secondary/30"></div>
        
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-secondary" />
          <span>Verified by 4K CCTV</span>
        </div>
        
        <div className="h-4 w-px bg-secondary/30"></div>
        
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-secondary" />
          <span>Guaranteed payout</span>
        </div>
      </div>
    </div>
  );
};