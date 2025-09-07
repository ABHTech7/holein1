import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";

interface NameCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (firstName: string, lastName?: string) => void;
  userId: string;
}

export const NameCollectionModal = ({
  open,
  onOpenChange,
  onComplete,
  userId
}: NameCollectionModalProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      toast({
        title: "First name required",
        description: "Please enter your first name to continue",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Update the user's profile with their name
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: `Welcome aboard, ${firstName}! 🏌️‍♂️`
      });

      // Refresh the profile in the auth context
      refreshProfile();

      onComplete(firstName.trim(), lastName.trim() || undefined);
      onOpenChange(false);
      
      // Reset form
      setFirstName("");
      setLastName("");
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Failed to update profile",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl font-['Montserrat']">
            We'd love to cheer you on by name!
          </DialogTitle>
          <DialogDescription>
            What should we call you during your hole-in-one journey?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name (optional)</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-12"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !firstName.trim()}
            className="w-full h-12 text-base font-medium rounded-xl"
          >
            {loading ? "Saving..." : "Let's Go! 🏌️‍♂️"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground px-4">
          We'll use this name to personalize your experience and celebrate your wins!
        </p>
      </DialogContent>
    </Dialog>
  );
};