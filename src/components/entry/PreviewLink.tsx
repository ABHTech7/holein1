import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createClubSlug } from "@/lib/competitionUtils";

interface PreviewLinkProps {
  competitionId: string;
  clubId: string;
  holeNumber: number;
}

export const PreviewLink = ({ competitionId, clubId, holeNumber }: PreviewLinkProps) => {
  const [previewUrl, setPreviewUrl] = useState(`/enter/${competitionId}`);

  useEffect(() => {
    const generateUrl = async () => {
      try {
        // Get club name directly
        const { data: club, error } = await supabase
          .from('clubs')
          .select('name')
          .eq('id', clubId)
          .single();
        
        if (club && !error) {
          const clubSlug = createClubSlug(club.name);
          
          console.log('Preview link using club:', club.name, 'slug:', clubSlug);
          setPreviewUrl(`/enter/${clubSlug}/${holeNumber}`);
        } else {
          console.error('Error fetching club for preview:', error);
          // Fallback to old URL format
          setPreviewUrl(`/enter/${competitionId}`);
        }
      } catch (error) {
        console.error('Error generating preview URL:', error);
        setPreviewUrl(`/enter/${competitionId}`);
      }
    };

    generateUrl();
  }, [competitionId, clubId, holeNumber]);

  return (
    <Button variant="outline" className="gap-2" asChild>
      <a href={previewUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-4 h-4" />
        Preview
      </a>
    </Button>
  );
};