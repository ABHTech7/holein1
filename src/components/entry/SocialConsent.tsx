import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Share2, Trophy, Camera } from 'lucide-react';

interface SocialConsentProps {
  consent: boolean;
  onConsentChange: (consent: boolean) => void;
}

export function SocialConsent({ consent, onConsentChange }: SocialConsentProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Share Your Legend</h3>
            <p className="text-sm text-muted-foreground">
              Help inspire others with your incredible achievement
            </p>
          </div>
        </div>

        <div className="bg-background/50 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-foreground">
              <p className="font-medium mb-1">Celebrate Your Success</p>
              <p className="text-muted-foreground">
                Your hole-in-one could be featured on our social media to celebrate this incredible achievement with the golf community.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Camera className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-foreground">
              <p className="font-medium mb-1">Optional Sharing</p>
              <p className="text-muted-foreground">
                We may use your submitted evidence (photos/videos) and competition details for promotional purposes across our platforms.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 bg-background/30 rounded-lg">
          <Checkbox
            id="social-consent"
            checked={consent}
            onCheckedChange={(checked) => onConsentChange(checked === true)}
            className="mt-0.5"
          />
          <Label 
            htmlFor="social-consent" 
            className="text-sm leading-relaxed cursor-pointer"
          >
            <span className="font-medium text-foreground">Yes, share my legend!</span>
            <br />
            <span className="text-muted-foreground">
              I consent to Official Hole in 1 using my submitted evidence and achievement details 
              for promotional and social media purposes to celebrate this hole-in-one.
            </span>
          </Label>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
          <p className="font-medium mb-1">Your Privacy Matters</p>
          <p>
            This consent is completely optional and doesn't affect your prize eligibility. 
            You can always contact us later to update your preferences.
          </p>
        </div>
      </div>
    </Card>
  );
}