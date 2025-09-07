import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { copyToClipboard } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";

interface ShareUrlDisplayProps {
  competitionId: string;
  clubId?: string;
  holeNumber: number;
  onCopy?: () => void;
}

export const ShareUrlDisplay = ({ competitionId, clubId, holeNumber, onCopy }: ShareUrlDisplayProps) => {
  const [shareUrl, setShareUrl] = useState(`${window.location.origin}/enter/${competitionId}`);

  useEffect(() => {
    const generateNewUrl = async () => {
      if (!clubId) return;
      
      try {
        const { data: venue } = await supabase
          .from('venues')
          .select('slug')
          .eq('club_id', clubId)
          .single();
        
        if (venue) {
          setShareUrl(`${window.location.origin}/enter/${venue.slug}/${holeNumber}`);
        }
      } catch (error) {
        console.error('Error generating new URL format:', error);
      }
    };

    generateNewUrl();
  }, [competitionId, clubId, holeNumber]);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      toast({
        title: "Copied!",
        description: "Share URL copied to clipboard",
      });
      onCopy?.();
    } else {
      toast({
        title: "Copy failed",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
      <code className="flex-1 text-sm">
        {shareUrl}
      </code>
      <Button size="sm" variant="outline" onClick={handleCopy}>
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );
};