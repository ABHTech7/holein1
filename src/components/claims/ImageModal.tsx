import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";

interface ImageModalProps {
  src: string;
  alt: string;
  trigger: React.ReactNode;
}

export const ImageModal = ({ src, alt, trigger }: ImageModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <div className="relative">
          <img
            src={src}
            alt={alt}
            className="w-full h-auto rounded-lg"
            loading="lazy"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
