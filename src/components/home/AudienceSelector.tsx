import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users } from "lucide-react";

interface AudienceSelectorProps {
  onAudienceChange: (audience: 'clubs' | 'players') => void;
  selectedAudience: 'clubs' | 'players';
}

const AudienceSelector = ({ onAudienceChange, selectedAudience }: AudienceSelectorProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleAudienceChange = (audience: 'clubs' | 'players') => {
    if (audience !== selectedAudience) {
      setIsTransitioning(true);
      // Add haptic feedback for mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onAudienceChange(audience);
      
      // Reset transition state after animation
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-12 relative">
      <Card 
        className={`flex-1 p-6 cursor-pointer transition-all duration-300 hover:shadow-medium transform hover:scale-105 ${
          selectedAudience === 'clubs' 
            ? 'ring-2 ring-primary/50 shadow-glow bg-white/90 scale-105 border-primary/30' 
            : 'hover:shadow-soft bg-card hover:bg-muted/20'
        } ${isTransitioning ? 'animate-pulse' : ''}`}
        onClick={() => handleAudienceChange('clubs')}
      >
        <div className="text-center relative">
          <div className={`transition-all duration-300 ${
            selectedAudience === 'clubs' ? 'animate-bounce' : ''
          }`}>
            <Trophy className={`w-10 h-10 mx-auto mb-3 transition-all duration-300 ${
              selectedAudience === 'clubs' 
                ? 'text-primary drop-shadow-lg scale-110' 
                : 'text-muted-foreground'
            }`} />
          </div>
          <h3 className={`font-display text-lg font-light mb-2 transition-all duration-300 ${
            selectedAudience === 'clubs' 
              ? 'text-primary font-normal text-xl' 
              : 'text-foreground'
          }`}>
            Golf Clubs
          </h3>
          <p className={`text-sm transition-all duration-300 ${
            selectedAudience === 'clubs' 
              ? 'text-primary/80 font-light' 
              : 'text-muted-foreground'
          }`}>
            Transform your course into a legendary destination
          </p>
          {selectedAudience === 'clubs' && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full animate-pulse" />
          )}
        </div>
      </Card>

      <Card 
        className={`flex-1 p-6 cursor-pointer transition-all duration-300 hover:shadow-medium transform hover:scale-105 ${
          selectedAudience === 'players' 
            ? 'ring-2 ring-secondary/50 shadow-gold bg-white/90 scale-105 border-secondary/30' 
            : 'hover:shadow-soft bg-card hover:bg-muted/20'
        } ${isTransitioning ? 'animate-pulse' : ''}`}
        onClick={() => handleAudienceChange('players')}
      >
        <div className="text-center relative">
          <div className={`transition-all duration-300 ${
            selectedAudience === 'players' ? 'animate-bounce' : ''
          }`}>
            <Users className={`w-10 h-10 mx-auto mb-3 transition-all duration-300 ${
              selectedAudience === 'players' 
                ? 'text-secondary drop-shadow-lg scale-110' 
                : 'text-muted-foreground'
            }`} />
          </div>
          <h3 className={`font-display text-lg font-light mb-2 transition-all duration-300 ${
            selectedAudience === 'players' 
              ? 'text-secondary font-normal text-xl' 
              : 'text-foreground'
          }`}>
            Golf Players
          </h3>
          <p className={`text-sm transition-all duration-300 ${
            selectedAudience === 'players' 
              ? 'text-secondary/80 font-light' 
              : 'text-muted-foreground'
          }`}>
            Experience the thrill of the perfect shot
          </p>
          {selectedAudience === 'players' && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-secondary rounded-full animate-pulse" />
          )}
        </div>
      </Card>
    </div>
  );
};

export default AudienceSelector;