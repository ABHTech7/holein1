import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

const VerificationStepIndicator: React.FC<VerificationStepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels
}) => {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      {/* Mobile Step Counter */}
      <div className="text-center mb-4">
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </div>
        <div className="text-lg font-semibold text-foreground">
          {stepLabels[currentStep - 1]}
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <React.Fragment key={stepNumber}>
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200",
                  {
                    "bg-success text-success-foreground": isCompleted,
                    "bg-primary text-primary-foreground": isCurrent,
                    "bg-muted text-muted-foreground": !isCompleted && !isCurrent,
                  }
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  stepNumber
                )}
              </div>
              
              {/* Connector Line */}
              {index < totalSteps - 1 && (
                <div className="w-8 h-1 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      {
                        "bg-success w-full": stepNumber < currentStep,
                        "bg-primary w-full": stepNumber === currentStep,
                        "bg-transparent w-0": stepNumber > currentStep,
                      }
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2 mt-4">
        <div
          className="bg-gradient-primary h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default VerificationStepIndicator;