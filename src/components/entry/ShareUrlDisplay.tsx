import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { copyToClipboard } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";
import { createClubSlug } from "@/lib/competitionUtils";

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
        const { data: club } = await supabase
          .from('clubs')
          .select('name')
          .eq('id', clubId)
          .single();
        
        if (club) {
          const clubSlug = createClubSlug(club.name);
          
          setShareUrl(`${window.location.origin}/enter/${clubSlug}/${holeNumber}`);
        }
      } catch (error) {
        console.error('Error generating new URL format:', error);
      }
    };

    generateNewUrl();
  }, [competitionId, clubId, holeNumber]);

  const handleCopy = async () => {
    // Try to copy first
    const success = await copyToClipboard(shareUrl);
    if (success) {
      toast({
        title: "Copied!",
        description: "Share URL copied to clipboard",
      });
      onCopy?.();
      return;
    }
    
    // If copy fails, select the text for manual copying
    const codeElement = document.querySelector('.share-url-text') as HTMLElement;
    if (codeElement) {
      // Create a range and select the text
      const range = document.createRange();
      range.selectNodeContents(codeElement);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      toast({
        title: "Text Selected",
        description: "URL is selected - press Ctrl+C (or Cmd+C) to copy",
      });
    } else {
      toast({
        title: "Copy the URL manually",
        description: "Select the URL text and copy it manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
      <code className="flex-1 text-sm share-url-text" style={{ userSelect: 'all' }}>
        {shareUrl}
      </code>
      <Button size="sm" variant="outline" onClick={handleCopy}>
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );
};