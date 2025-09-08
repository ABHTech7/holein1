import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { createClubSlug, createCompetitionSlug } from "@/lib/competitionUtils";
import { ClubService } from "@/lib/clubService";

interface PreviewLinkProps {
  competitionId: string;
  competitionName: string;
  clubId: string;
  holeNumber: number;
}

export const PreviewLink = ({ competitionId, competitionName, clubId, holeNumber }: PreviewLinkProps) => {
  const [previewUrl, setPreviewUrl] = useState(`/enter/${competitionId}`);

  useEffect(() => {
    const generateUrl = async () => {
      try {
        // Get safe club data (works for unauthenticated users)
        const clubs = await ClubService.getSafeClubsData();
        const club = clubs.find(c => c.id === clubId);
        
        if (club) {
          const clubSlug = createClubSlug(club.name);
          const competitionSlug = createCompetitionSlug(competitionName);
          
          console.log('Preview link using club:', club.name, 'competition:', competitionName);
          setPreviewUrl(`/enter/${clubSlug}/${competitionSlug}`);
        } else {
          console.error('Club not found for preview:', clubId);
          // Fallback to old URL format
          setPreviewUrl(`/enter/${competitionId}`);
        }
      } catch (error) {
        console.error('Error generating preview URL:', error);
        setPreviewUrl(`/enter/${competitionId}`);
      }
    };

    generateUrl();
  }, [competitionId, competitionName, clubId, holeNumber]);

  return (
    <Button variant="outline" className="gap-2" asChild>
      <a href={previewUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-4 h-4" />
        Preview
      </a>
    </Button>
  );
};