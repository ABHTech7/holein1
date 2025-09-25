import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import useAuth from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SiteHeader from '@/components/layout/SiteHeader';
import Section from '@/components/layout/Section';
import { 
  ArrowLeft,
  Save,
  X,
  Calendar as CalendarIcon,
  Archive,
  Trash2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Competition {
  id: string;
  name: string;
  description: string;
  hole_number: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED';
  start_date: string;
  end_date: string | null;
  entry_fee: number;
  prize_pool: number;
  commission_amount: number;
  is_year_round: boolean;
  archived: boolean;
  club_id: string;
  hero_image_url: string | null;
  clubs: {
    name: string;
  };
}

const editFormSchema = z.object({
  name: z.string().min(1, 'Competition name is required'),
  description: z.string().optional(),
  hole_number: z.number().min(1, 'Hole number must be at least 1').max(18, 'Hole number must be at most 18'),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date().optional(),
  is_year_round: z.boolean(),
  entry_fee: z.number().min(0, 'Entry fee must be at least 0'),
  prize_pool: z.number().min(0, 'Prize pool must be at least 0').optional(),
  commission_amount: z.number().min(0, 'Commission amount must be at least 0'),
}).refine((data) => {
  if (!data.is_year_round && !data.end_date) {
    return false;
  }
  if (data.end_date && data.end_date <= data.start_date) {
    return false;
  }
  return true;
}, {
  message: "End date is required for non-year-round competitions and must be after start date",
  path: ["end_date"],
});

type EditFormData = z.infer<typeof editFormSchema>;

const CompetitionEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
  });

  // Fetch competition data
  useEffect(() => {
    const fetchCompetition = async () => {
      if (!id || !user) return;

      try {
        const { data, error } = await supabase
          .from('competitions')
          .select(`
            *,
            clubs:clubs(name)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        setCompetition(data);
        
        // Set hero image preview if exists
        if (data.hero_image_url) {
          setHeroImagePreview(data.hero_image_url);
        }
        
        // Set form defaults
        form.reset({
          name: data.name,
          description: data.description || '',
          hole_number: data.hole_number,
          start_date: new Date(data.start_date),
          end_date: data.end_date ? new Date(data.end_date) : undefined,
          is_year_round: data.is_year_round || false,
          entry_fee: data.entry_fee / 100, // Convert from cents
          prize_pool: data.prize_pool ? data.prize_pool / 100 : 0, // Convert from cents
          commission_amount: data.commission_amount ? data.commission_amount / 100 : 0, // Convert from pence
        });
      } catch (error) {
        console.error('Error fetching competition:', error);
        toast({
          title: 'Error',
          description: 'Failed to load competition details',
          variant: 'destructive',
        });
        navigate('/dashboard/admin/competitions');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [id, user, form, toast, navigate]);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      console.log('Starting hero image upload for competition:', competition!.id);
      
      // Delete old image if it exists
      if (competition!.hero_image_url) {
        try {
          const oldUrl = competition!.hero_image_url;
          console.log('Attempting to delete old image:', oldUrl);
          
          // Extract filename from URL - handle both direct filenames and full URLs
          let oldFileName = '';
          if (oldUrl.includes('competition-heroes/')) {
            const pathParts = oldUrl.split('competition-heroes/');
            oldFileName = pathParts[1].split('?')[0]; // Remove query params
          } else if (oldUrl.includes('/')) {
            const urlParts = oldUrl.split('/');
            oldFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
          }
          
          if (oldFileName) {
            const { error: deleteError } = await supabase.storage
              .from('competition-heroes')
              .remove([oldFileName]);
            
            if (deleteError) {
              console.warn('Delete error (continuing):', deleteError);
            } else {
              console.log('Successfully deleted old image:', oldFileName);
            }
          }
        } catch (deleteError) {
          console.warn('Could not delete old image:', deleteError);
          // Continue with upload even if deletion fails
        }
      }
      
      // Create folder structure: competitions/{competitionId}/{timestamp}.{ext}
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const folderPath = `competitions/${competition!.id}/${timestamp}.${fileExt}`;
      
      console.log('Uploading to path:', folderPath);

      const { error } = await supabase.storage
        .from('competition-heroes')
        .upload(folderPath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true, // Allow overwriting if exists
          duplex: 'half' // Required for Safari compatibility
        });

      if (error) {
        console.error('Upload error details:', error);
        throw error;
      }

      console.log('Upload successful, getting public URL...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('competition-heroes')
        .getPublicUrl(folderPath);

      // Add cache buster to ensure new image displays immediately
      const finalUrl = `${publicUrl}?v=${timestamp}`;
      console.log('Final image URL:', finalUrl);
      
      return finalUrl;
    } catch (error) {
      console.error('Error uploading hero image:', error);
      
      // Reset UI state on error
      if (competition!.hero_image_url) {
        setHeroImagePreview(competition!.hero_image_url);
      } else {
        setHeroImagePreview(null);
      }
      setHeroImageFile(null);
      
      toast({
        title: 'Upload Error',
        description: `Failed to upload hero image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setHeroImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setHeroImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: EditFormData) => {
    if (!competition) return;

    setSaving(true);
    try {
      let heroImageUrl = competition.hero_image_url;
      
      // Upload new hero image if selected
      if (heroImageFile) {
        const uploadedUrl = await handleImageUpload(heroImageFile);
        if (uploadedUrl) {
          heroImageUrl = uploadedUrl;
        }
      }

      // Convert entry fee back to cents and commission to pence
      const entry_fee_cents = Math.round(data.entry_fee * 100);
      const prize_pool_cents = data.prize_pool ? Math.round(data.prize_pool * 100) : null;
      const commission_amount_pence = Math.round(data.commission_amount * 100);
      
      // Determine new status based on dates and year-round flag
      const now = new Date();
      let newStatus: 'SCHEDULED' | 'ACTIVE' | 'ENDED' = 'SCHEDULED';
      
      if (data.is_year_round) {
        newStatus = now >= data.start_date ? 'ACTIVE' : 'SCHEDULED';
      } else if (data.end_date) {
        if (now < data.start_date) {
          newStatus = 'SCHEDULED';
        } else if (now >= data.start_date && now <= data.end_date) {
          newStatus = 'ACTIVE';
        } else {
          newStatus = 'ENDED';
        }
      }

      const { error } = await supabase
        .from('competitions')
        .update({
          name: data.name,
          description: data.description || null,
          hole_number: data.hole_number,
          start_date: data.start_date.toISOString(),
          end_date: data.is_year_round ? null : data.end_date?.toISOString() || null,
          is_year_round: data.is_year_round,
          entry_fee: entry_fee_cents,
          prize_pool: prize_pool_cents,
          commission_amount: commission_amount_pence,
          status: newStatus,
          hero_image_url: heroImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', competition.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Competition updated successfully',
      });

      navigate(`/dashboard/admin/competitions/${competition.id}`);
    } catch (error) {
      console.error('Error updating competition:', error);
      toast({
        title: 'Error',
        description: 'Failed to update competition',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!competition) return;

    try {
      const { error } = await supabase
        .from('competitions')
        .update({ 
          archived: true,
          status: 'ENDED'
        })
        .eq('id', competition.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Competition archived and status set to ENDED successfully',
      });

      navigate('/dashboard/admin/competitions');
    } catch (error) {
      console.error('Error archiving competition:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive competition',
        variant: 'destructive',
      });
    }
    setShowArchiveModal(false);
  };

  const handleDelete = async () => {
    if (!competition) return;

    try {
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', competition.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Competition deleted successfully',
      });

      navigate('/dashboard/admin/competitions');
    } catch (error) {
      console.error('Error deleting competition:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete competition',
        variant: 'destructive',
      });
    }
    setShowDeleteModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 bg-muted/30">
          <Section spacing="lg">
            <div className="max-w-4xl mx-auto space-y-6">
              <Skeleton className="h-10 w-48" />
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-32" />
                </CardContent>
              </Card>
            </div>
          </Section>
        </main>
      </div>
    );
  }

  if (!competition) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 bg-muted/30">
        <Section spacing="lg">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Button and Actions */}
            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/dashboard/admin/competitions/${competition.id}`)}
                className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border-primary/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Competition
              </Button>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowArchiveModal(true)}
                  className="text-orange-600 hover:text-orange-700"
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Archive
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">Edit Competition</h1>
                <p className="text-muted-foreground mt-1">
                  {competition.clubs.name} • {competition.name}
                </p>
              </div>
            </div>

            {/* Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle>Competition Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Competition Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Competition Name *</Label>
                      <Input
                        id="name"
                        {...form.register('name')}
                        placeholder="Enter competition name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Hole Number */}
                    <div className="space-y-2">
                      <Label htmlFor="hole_number">Hole Number *</Label>
                      <Input
                        id="hole_number"
                        type="number"
                        min="1"
                        max="18"
                        {...form.register('hole_number', { valueAsNumber: true })}
                        placeholder="1-18"
                      />
                      {form.formState.errors.hole_number && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.hole_number.message}
                        </p>
                      )}
                    </div>
                  </div>

                   {/* Description */}
                   <div className="space-y-2">
                     <Label htmlFor="description">Description</Label>
                     <Textarea
                       id="description"
                       {...form.register('description')}
                       placeholder="Enter competition description"
                       rows={3}
                     />
                   </div>

                   {/* Hero Image Upload */}
                   <div className="space-y-2">
                     <Label htmlFor="hero_image">Hero Image</Label>
                     <div className="space-y-4">
                       {heroImagePreview && (
                         <div className="relative">
                           <img 
                             src={heroImagePreview} 
                             alt="Hero preview" 
                             className="w-full h-48 object-cover rounded-lg border"
                           />
                           <Button
                             type="button"
                             variant="ghost"
                             size="sm"
                             className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                             onClick={() => {
                               setHeroImagePreview(null);
                               setHeroImageFile(null);
                             }}
                           >
                             <X className="w-4 h-4" />
                           </Button>
                         </div>
                       )}
                       <div className="flex items-center gap-4">
                         <Input
                           id="hero_image"
                           type="file"
                           accept="image/*"
                           onChange={handleImageChange}
                           className="hidden"
                         />
                         <Button
                           type="button"
                           variant="outline"
                           onClick={() => document.getElementById('hero_image')?.click()}
                           disabled={uploadingImage}
                           className="gap-2"
                         >
                           {uploadingImage ? (
                             <>
                               <Upload className="w-4 h-4 animate-spin" />
                               Uploading...
                             </>
                           ) : (
                             <>
                               <ImageIcon className="w-4 h-4" />
                               {heroImagePreview ? 'Change Image' : 'Upload Hero Image'}
                             </>
                           )}
                         </Button>
                       </div>
                       <p className="text-sm text-muted-foreground">
                         Upload a hero image for the competition entry page. Recommended size: 800x600px or larger. Max file size: 5MB.
                       </p>
                     </div>
                   </div>

                  {/* Year-round competition toggle */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_year_round"
                      checked={form.watch('is_year_round')}
                      onCheckedChange={(checked) => {
                        form.setValue('is_year_round', !!checked);
                        if (checked) {
                          form.setValue('end_date', undefined);
                        }
                      }}
                    />
                    <Label htmlFor="is_year_round">This is a year-round competition</Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !form.watch('start_date') && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.watch('start_date') ? format(form.watch('start_date'), "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={form.watch('start_date')}
                            onSelect={(date) => date && form.setValue('start_date', date)}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      {form.formState.errors.start_date && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.start_date.message}
                        </p>
                      )}
                    </div>

                    {/* End Date - only show if not year-round */}
                    {!form.watch('is_year_round') && (
                      <div className="space-y-2">
                        <Label>End Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !form.watch('end_date') && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {form.watch('end_date') ? format(form.watch('end_date'), "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={form.watch('end_date')}
                              onSelect={(date) => form.setValue('end_date', date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        {form.formState.errors.end_date && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.end_date.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Entry Fee */}
                     <div className="space-y-2">
                       <Label htmlFor="entry_fee">Entry Fee (£) *</Label>
                       <Input
                         id="entry_fee"
                         type="number"
                         step="0.01"
                         min="0"
                         {...form.register('entry_fee', { valueAsNumber: true })}
                         placeholder="0.00"
                       />
                       {form.formState.errors.entry_fee && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.entry_fee.message}
                        </p>
                      )}
                    </div>

                     {/* Cash Prize */}
                     <div className="space-y-2">
                       <Label htmlFor="prize_pool">CASH PRIZE (£)</Label>
                       <Input
                         id="prize_pool"
                         type="number"
                         step="0.01"
                         min="0"
                         {...form.register('prize_pool', { valueAsNumber: true })}
                         placeholder="0.00"
                       />
                       {form.formState.errors.prize_pool && (
                         <p className="text-sm text-destructive">
                           {form.formState.errors.prize_pool.message}
                         </p>
                       )}
                     </div>
                  </div>

                  {/* Commission Amount - Full Width */}
                  <div className="space-y-2">
                    <Label htmlFor="commission_amount">Commission Amount (£) *</Label>
                    <Input
                      id="commission_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register('commission_amount', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    <p className="text-sm text-muted-foreground">
                      Fixed commission amount paid to the club per paid entry
                    </p>
                    {form.formState.errors.commission_amount && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.commission_amount.message}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                    <Button type="submit" disabled={saving} className="gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => navigate(`/dashboard/admin/competitions/${competition.id}`)}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>

      {/* Archive Modal */}
      <AlertDialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Competition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{competition.name}"? This will hide it from the main competitions list, but it can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-orange-600 hover:bg-orange-700">
              Archive Competition
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Competition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{competition.name}"? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Competition
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompetitionEditPage;