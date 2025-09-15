import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Shield,
  Sparkles
} from "lucide-react";

interface VerificationSuccessProps {
  competitionName: string;
  prizeAmount: number;
  onComplete: () => void;
}

const VerificationSuccess: React.FC<VerificationSuccessProps> = ({
  competitionName,
  prizeAmount,
  onComplete
}) => {
  return (
    <div className="space-y-8">
      {/* Success Animation */}
      <div className="text-center animate-fade-in">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Animated Trophy */}
          <div className="w-24 h-24 bg-gradient-gold rounded-full flex items-center justify-center shadow-strong animate-pulse">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          {/* Sparkles */}
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-6 h-6 text-secondary animate-bounce" />
          </div>
          <div className="absolute -bottom-2 -left-2">
            <Sparkles className="w-4 h-4 text-secondary animate-bounce" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
        
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Verification Submitted! 🏆
        </h1>
        <p className="text-lg text-muted-foreground">
          Your hole-in-one claim is now under review
        </p>
      </div>

      {/* Success Card */}
      <Card className="shadow-medium animate-slide-up">
        <CardContent className="p-8 text-center space-y-6">
          {/* Competition Info */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {competitionName}
            </h2>
            <div className="text-2xl font-bold text-primary">
              £{(prizeAmount / 100).toFixed(2)} Prize
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap justify-center gap-2">
            <Badge className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Evidence Submitted
            </Badge>
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1" />
              Under Review
            </Badge>
          </div>

          {/* What Happens Next */}
          <div className="space-y-4 text-left">
            <h3 className="font-semibold text-center text-foreground">
              What happens next?
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-foreground">Witness Verification</div>
                  <div className="text-muted-foreground">
                    Your witness will receive an email to confirm they saw your shot
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-foreground">Document Review</div>
                  <div className="text-muted-foreground">
                    Our team will verify your identity and handicap documents
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-foreground">Prize Award</div>
                  <div className="text-muted-foreground">
                    If verified, your prize will be processed within 5-7 business days
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <div className="space-y-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-foreground mb-1">
                  Check Your Email
                </div>
                <div className="text-muted-foreground">
                  We've sent you a confirmation email with your claim reference number. 
                  Keep this for your records.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-foreground mb-1">
                  Verification Timeline
                </div>
                <div className="text-muted-foreground">
                  Most claims are reviewed within 24-48 hours. You'll be notified by email 
                  once the verification is complete.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complete Button */}
      <div className="pt-4">
        <Button
          onClick={onComplete}
          className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:bg-gradient-primary/90 shadow-medium"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Complete Verification
        </Button>
      </div>
    </div>
  );
};

export default VerificationSuccess;