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
  heroImageUrl?: string | null;
}

export const EntryHero = ({ 
  holeName, 
  holeNumber, 
  prize, 
  entryFee, 
  imageUrl = "/img/entry-hero.jpg",
  venueName,
  heroImageUrl
}: EntryHeroProps) => {
  const displayImageUrl = heroImageUrl || imageUrl;
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
          {/* Hero Content */}
          <div className="space-y-4 sm:space-y-6">
            <Badge className="bg-primary/10 text-primary border-primary/20 font-medium text-xs sm:text-sm">
              {venueName}
            </Badge>
            
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold font-['Montserrat'] text-foreground">
                {holeName}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-base sm:text-lg font-medium">Hole #{holeNumber}</span>
              </div>
            </div>

            {/* Prize and Fee Display */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-3 sm:p-4 text-center">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    £{(prize / 100).toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                    CASH PRIZE
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-muted/20">
                <CardContent className="p-3 sm:p-4 text-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    £{(entryFee / 100).toFixed(2)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                    ENTRY FEE
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative order-first lg:order-last">
            <div className="aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl">
              <img 
                src={displayImageUrl}
                alt={`${holeName} at ${venueName}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl sm:rounded-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};