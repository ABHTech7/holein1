import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Camera, 
  Upload, 
  X, 
  CheckCircle2,
  AlertCircle,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WinClaimFormProps {
  entryId: string;
  competitionName: string;
  holeNumber: number;
  venueName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const WinClaimForm = ({ 
  entryId, 
  competitionName, 
  holeNumber, 
  venueName, 
  onSuccess, 
  onCancel 
}: WinClaimFormProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [witnessName, setWitnessName] = useState("");
  const [witnessContact, setWitnessContact] = useState("");
  const [notes, setNotes] = useState("");
  const [showGuidelines, setShowGuidelines] = useState(false);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (photos.length + files.length > 3) {
      toast({
        title: "Too many photos",
        description: "Maximum 3 photos allowed",
        variant: "destructive"
      });
      return;
    }
    
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (claimId: string) => {
    const photoUrls = [];
    
    for (const [index, photo] of photos.entries()) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `claim-${claimId}-${index + 1}.${fileExt}`;
      const filePath = `claims/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('competition-heroes')
        .upload(filePath, photo);

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        continue; // Don't fail the whole submission for photo issues
      }

      const { data: { publicUrl } } = supabase.storage
        .from('competition-heroes')
        .getPublicUrl(filePath);
      
      photoUrls.push(publicUrl);
    }
    
    return photoUrls;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!witnessName.trim()) {
      toast({
        title: "Witness required",
        description: "Please provide witness details for verification",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // First, update the entry outcome
      const { error: entryError } = await supabase
        .from('entries')
        .update({
          outcome_self: 'win',
          outcome_reported_at: new Date().toISOString()
        })
        .eq('id', entryId);

      if (entryError) throw entryError;

      // Create the claim record
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .insert({
          entry_id: entryId,
          hole_number: holeNumber,
          witness_name: witnessName.trim(),
          witness_contact: witnessContact.trim(),
          notes: notes.trim(),
          status: 'PENDING'
        })
        .select()
        .single();

      if (claimError) throw claimError;

      // Upload photos if any
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos(claim.id);
        
        // Update claim with photo URLs
        if (photoUrls.length > 0) {
          await supabase
            .from('claims')
            .update({ photo_urls: photoUrls })
            .eq('id', claim.id);
        }
      }

      toast({
        title: "Win claim submitted!",
        description: "Your claim is now pending verification by the club",
      });

      onSuccess();

    } catch (error: any) {
      console.error('Win claim submission error:', error);
      toast({
        title: "Submission failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Congratulations on your Hole in 1! 🎉
          </CardTitle>
          <CardDescription>
            {competitionName} - Hole {holeNumber} at {venueName}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guidelines Alert */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Verification Guidelines</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    To verify your win, we need witness information and optional photo evidence.
                  </p>
                  <Button 
                    type="button"
                    variant="link" 
                    size="sm"
                    className="text-blue-600 p-0 h-auto"
                    onClick={() => setShowGuidelines(true)}
                  >
                    View detailed guidelines →
                  </Button>
                </div>
              </div>
            </div>

            {/* Witness Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Witness Information</h3>
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="witness-name">Witness Name *</Label>
                  <Input
                    id="witness-name"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    placeholder="Full name of witness"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="witness-contact">Witness Contact</Label>
                  <Input
                    id="witness-contact"
                    value={witnessContact}
                    onChange={(e) => setWitnessContact(e.target.value)}
                    placeholder="Phone number or email"
                  />
                </div>
              </div>
            </div>

            {/* Photo Evidence */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Camera className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Photo Evidence</h3>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Evidence ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 w-6 h-6 p-0"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {photos.length < 3 && (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/20 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Upload up to 3 photos showing the ball in or near the hole, your position, or other evidence
              </p>
            </div>

            {/* Additional Notes */}
            <div>
              <Label htmlFor="notes">Additional Details</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details about your shot (optional)"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={submitting || !witnessName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting Claim...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Win Claim
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Guidelines Modal */}
      <Dialog open={showGuidelines} onOpenChange={setShowGuidelines}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Win Verification Guidelines</DialogTitle>
            <DialogDescription>
              Follow these guidelines to ensure smooth verification
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Witness Requirements:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Must be present during the shot</li>
                <li>• Preferably another golfer or club member</li>
                <li>• Provide full name and contact info</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Photo Evidence (Optional):</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Ball in or very near the hole</li>
                <li>• Clear view of the pin/hole</li>
                <li>• Your position at the tee (if someone can take it)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Verification Process:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Club reviews your claim within 48 hours</li>
                <li>• Witness may be contacted for confirmation</li>
                <li>• Prize awarded upon approval</li>
              </ul>
            </div>
          </div>
          
          <Button onClick={() => setShowGuidelines(false)} className="w-full">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WinClaimForm;