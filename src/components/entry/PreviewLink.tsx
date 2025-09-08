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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateUrl = async () => {
      console.log('🔗 PreviewLink: Starting URL generation', {
        competitionId,
        competitionName,
        clubId,
        holeNumber
      });
      
      setIsGenerating(true);
      setError(null);
      
      try {
        // Get safe club data (works for unauthenticated users)
        console.log('🔗 PreviewLink: Fetching clubs data...');
        const clubs = await ClubService.getSafeClubsData();
        console.log('🔗 PreviewLink: Got clubs:', clubs.length, 'clubs');
        
        const club = clubs.find(c => c.id === clubId);
        
        if (club) {
          const clubSlug = createClubSlug(club.name);
          const competitionSlug = createCompetitionSlug(competitionName);
          const newUrl = `/enter/${clubSlug}/${competitionSlug}`;
          
          console.log('🔗 PreviewLink: Generated URL components:', {
            clubName: club.name,
            clubSlug,
            competitionName,
            competitionSlug,
            finalUrl: newUrl
          });
          
          setPreviewUrl(newUrl);
        } else {
          const errorMsg = `Club not found for preview: ${clubId}`;
          console.error('🔗 PreviewLink:', errorMsg);
          console.log('🔗 PreviewLink: Available clubs:', clubs.map(c => ({ id: c.id, name: c.name })));
          setError(errorMsg);
          // Fallback to old URL format
          setPreviewUrl(`/enter/${competitionId}`);
        }
      } catch (error) {
        const errorMsg = `Error generating preview URL: ${error}`;
        console.error('🔗 PreviewLink:', errorMsg, error);
        setError(errorMsg);
        setPreviewUrl(`/enter/${competitionId}`);
      } finally {
        setIsGenerating(false);
      }
    };

    generateUrl();
  }, [competitionId, competitionName, clubId, holeNumber]);

  return (
    <Button 
      variant="outline" 
      className="gap-2" 
      disabled={isGenerating || !!error}
      asChild={!isGenerating && !error}
    >
      {isGenerating || error ? (
        <span>
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              Generating...
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              Preview (Error)
            </>
          )}
        </span>
      ) : (
        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4" />
          Preview
        </a>
      )}
    </Button>
  );
};