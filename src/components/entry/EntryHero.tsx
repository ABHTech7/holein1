import { Trophy, Target, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EntryHeroProps {
  holeName: string;
  holeNumber: number;
  prize: number;
  entryFee: number;
  imageUrl?: string;
  venueName: string;
}

export const EntryHero = ({ 
  holeName, 
  holeNumber, 
  prize, 
  entryFee, 
  imageUrl = "/img/entry-hero.jpg",
  venueName 
}: EntryHeroProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Hero Content */}
          <div className="space-y-6">
            <Badge className="bg-primary/10 text-primary border-primary/20 font-medium">
              {venueName}
            </Badge>
            
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-bold font-['Montserrat'] text-foreground">
                {holeName}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-5 h-5" />
                <span className="text-lg font-medium">Hole #{holeNumber}</span>
              </div>
            </div>

            {/* Prize and Fee Display */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-primary">
                    £{(prize / 100).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    CASH PRIZE
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-muted/20">
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">
                    £{(entryFee / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    ENTRY FEE
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={imageUrl}
                alt={`${holeName} at ${venueName}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};