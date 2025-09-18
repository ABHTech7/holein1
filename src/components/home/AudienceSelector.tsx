import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users } from "lucide-react";

interface AudienceSelectorProps {
  onAudienceChange: (audience: 'clubs' | 'players') => void;
  selectedAudience: 'clubs' | 'players';
}

const AudienceSelector = ({ onAudienceChange, selectedAudience }: AudienceSelectorProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-12">
      <Card 
        className={`flex-1 p-6 cursor-pointer transition-all duration-300 hover:shadow-medium ${
          selectedAudience === 'clubs' ? 'ring-2 ring-primary shadow-glow' : 'hover:shadow-soft'
        }`}
        onClick={() => onAudienceChange('clubs')}
      >
        <div className="text-center">
          <Trophy className={`w-8 h-8 mx-auto mb-3 ${
            selectedAudience === 'clubs' ? 'text-primary' : 'text-muted-foreground'
          }`} />
          <h3 className={`font-display text-lg font-semibold mb-2 ${
            selectedAudience === 'clubs' ? 'text-primary' : 'text-foreground'
          }`}>
            Golf Clubs
          </h3>
          <p className="text-sm text-muted-foreground">
            Transform your course into a legendary destination
          </p>
        </div>
      </Card>

      <Card 
        className={`flex-1 p-6 cursor-pointer transition-all duration-300 hover:shadow-medium ${
          selectedAudience === 'players' ? 'ring-2 ring-secondary shadow-gold' : 'hover:shadow-soft'
        }`}
        onClick={() => onAudienceChange('players')}
      >
        <div className="text-center">
          <Users className={`w-8 h-8 mx-auto mb-3 ${
            selectedAudience === 'players' ? 'text-secondary' : 'text-muted-foreground'
          }`} />
          <h3 className={`font-display text-lg font-semibold mb-2 ${
            selectedAudience === 'players' ? 'text-secondary' : 'text-foreground'
          }`}>
            Golf Players
          </h3>
          <p className="text-sm text-muted-foreground">
            Experience the thrill of the perfect shot
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AudienceSelector;