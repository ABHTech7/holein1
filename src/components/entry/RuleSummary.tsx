import { CheckCircle, Clock, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RuleSummaryProps {
  rules?: {
    timeLimit?: number;
    witnessRequired?: boolean;
    videoRequired?: boolean;
  };
}

export const RuleSummary = ({ rules }: RuleSummaryProps) => {
  const defaultRules = [
    {
      icon: Target,
      title: "Hole-in-One Required",
      description: "Ball must go directly into the hole in one stroke from the tee"
    },
    {
      icon: Clock,
      title: "15-Minute Window",
      description: "You have 15 minutes after entry to attempt your shot"
    },
    {
      icon: CheckCircle,
      title: "Witness & Staff Verification",
      description: "Minimum 1 witness required plus staff verification code"
    }
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-['Montserrat'] flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Competition Rules
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {defaultRules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-foreground mb-1">
                    {rule.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rule.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};