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
  Calendar as CalendarIcon
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  max_participants: number;
  commission_amount: number;
  is_year_round: boolean;
  club_id: string;
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
  max_participants: z.number().min(1, 'Max participants must be at least 1').optional(),
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
        
        // Set form defaults
        form.reset({
          name: data.name,
          description: data.description || '',
          hole_number: data.hole_number,
          start_date: new Date(data.start_date),
          end_date: data.end_date ? new Date(data.end_date) : undefined,
          is_year_round: data.is_year_round || false,
          entry_fee: data.entry_fee / 100, // Convert from cents
          max_participants: data.max_participants || undefined,
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

  const onSubmit = async (data: EditFormData) => {
    if (!competition) return;

    setSaving(true);
    try {
      // Convert entry fee back to cents and commission to pence
      const entry_fee_cents = Math.round(data.entry_fee * 100);
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
          max_participants: data.max_participants || null,
          commission_amount: commission_amount_pence,
          status: newStatus,
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
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/dashboard/admin/competitions/${competition.id}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Competition Details
              </Button>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                    {/* Max Participants */}
                    <div className="space-y-2">
                      <Label htmlFor="max_participants">Max Participants</Label>
                      <Input
                        id="max_participants"
                        type="number"
                        min="1"
                        {...form.register('max_participants', { valueAsNumber: true })}
                        placeholder="Unlimited"
                      />
                      {form.formState.errors.max_participants && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.max_participants.message}
                        </p>
                      )}
                    </div>

                    {/* Commission Amount */}
                    <div className="space-y-2">
                      <Label htmlFor="commission_amount">Commission Amount (£)</Label>
                      <Input
                        id="commission_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register('commission_amount', { valueAsNumber: true })}
                        placeholder="0.00"
                      />
                      {form.formState.errors.commission_amount && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.commission_amount.message}
                        </p>
                      )}
                    </div>
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
    </div>
  );
};

export default CompetitionEditPage;