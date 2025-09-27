import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  clubName: z.string().min(1, "Club name is required"),
  clubAddress: z.string().min(1, "Club address is required"),
  clubEmail: z.string().email("Please enter a valid email"),
  clubPhone: z.string().optional(),
  clubWebsite: z.string().optional(),
  managerFirstName: z.string().min(1, "Manager first name is required"),
  managerLastName: z.string().min(1, "Manager last name is required"),
  managerEmail: z.string().email("Please enter a valid manager email"),
  managerPhone: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface NewClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewClubModal = ({ isOpen, onClose, onSuccess }: NewClubModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clubName: "",
      clubAddress: "",
      clubEmail: "",
      clubPhone: "",
      clubWebsite: "",
      managerFirstName: "",
      managerLastName: "",
      managerEmail: "",
      managerPhone: ""
    }
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Use the admin Edge Function to create the club
      const { data: response, error } = await supabase.functions.invoke('admin-upsert-club', {
        body: {
          clubName: data.clubName,
          clubAddress: data.clubAddress,
          clubEmail: data.clubEmail,
          clubPhone: data.clubPhone,
          clubWebsite: data.clubWebsite,
          managerFirstName: data.managerFirstName,
          managerLastName: data.managerLastName,
          managerEmail: data.managerEmail,
          managerPhone: data.managerPhone
        }
      });

      if (error) throw error;

      if (!response.success) {
        throw new Error(response.error || 'Failed to create club');
      }

      toast({
        title: "Club created successfully!",
        description: response.message || `Club ${data.clubName} has been created.`,
      });

      form.reset();
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error creating club:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create club. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Club</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Club Details</h3>
              
              <FormField
                control={form.control}
                name="clubName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter club name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clubAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Address *</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter full club address" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clubEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Club Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="club@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clubPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Club Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="01234 567890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="clubWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://www.clubwebsite.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Manager Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="managerFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="First name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managerLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Last name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="managerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="manager@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="07123 456789" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Club"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewClubModal;