import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
        const { data: venue } = await supabase
          .from('venues')
          .select('slug')
          .eq('club_id', clubId)
          .single();
        
        if (venue) {
          setPreviewUrl(`/enter/${venue.slug}/${holeNumber}`);
        }
      } catch (error) {
        console.error('Error generating preview URL:', error);
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