import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

const stepSchemas = [
  // Step 1: Basics
  z.object({
    name: z.string().min(1, 'Competition name is required').max(100, 'Name too long'),
    hole_number: z.number().min(1, 'Hole must be 1-18').max(18, 'Hole must be 1-18'),
    description: z.string().min(1, 'Prize description is required').max(500, 'Description too long'),
  }),
  // Step 2: Schedule
  z.object({
    start_date: z.date({ required_error: 'Start date is required' }),
    end_date: z.date({ required_error: 'End date is required' }),
  }).refine((data) => data.start_date < data.end_date, {
    message: 'End date must be after start date',
    path: ['end_date'],
  }),
  // Step 3: Pricing
  z.object({
    entry_fee: z.number().min(0, 'Entry fee cannot be negative'),
    visibility_notes: z.string().max(200, 'Notes too long').optional(),
  }),
  // Step 4: Review (no additional validation needed)
  z.object({}),
];

const fullSchema = z.object({
  name: z.string().min(1, 'Competition name is required').max(100, 'Name too long'),
  hole_number: z.number().min(1, 'Hole must be 1-18').max(18, 'Hole must be 1-18'),
  description: z.string().min(1, 'Prize description is required').max(500, 'Description too long'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date({ required_error: 'End date is required' }),
  entry_fee: z.number().min(0, 'Entry fee cannot be negative'),
  visibility_notes: z.string().max(200, 'Notes too long').optional(),
}).refine((data) => data.start_date < data.end_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type FormData = z.infer<typeof fullSchema>;

interface CompetitionWizardProps {
  clubId: string;
  prefillData?: Partial<FormData>;
}

const CompetitionWizard = ({ clubId, prefillData }: CompetitionWizardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      name: prefillData?.name || '',
      hole_number: prefillData?.hole_number || 1,
      description: prefillData?.description || '',
      start_date: prefillData?.start_date || new Date(),
      end_date: prefillData?.end_date || new Date(Date.now() + 86400000), // +1 day
      entry_fee: prefillData?.entry_fee || 0,
      visibility_notes: prefillData?.visibility_notes || '',
    },
    mode: 'onChange',
  });

  const watchedValues = form.watch();

  const checkForOverlaps = async (holeNumber: number, startDate: Date, endDate: Date) => {
    try {
      const { data: existingCompetitions, error } = await supabase
        .from('competitions')
        .select('id, name, start_date, end_date')
        .eq('club_id', clubId)
        .eq('hole_number', holeNumber)
        .in('status', ['SCHEDULED', 'ACTIVE']);

      if (error) throw error;

      const overlapping = existingCompetitions?.find(comp => {
        const compStart = new Date(comp.start_date);
        const compEnd = new Date(comp.end_date);
        return (startDate <= compEnd && endDate >= compStart);
      });

      if (overlapping) {
        setOverlapWarning(
          `Warning: This overlaps with "${overlapping.name}" (${format(new Date(overlapping.start_date), 'PPp')} - ${format(new Date(overlapping.end_date), 'PPp')})`
        );
        return true;
      }

      setOverlapWarning(null);
      return false;
    } catch (error) {
      console.error('Error checking overlaps:', error);
      return false;
    }
  };

  const validateStep = async (step: number) => {
    const currentSchema = stepSchemas[step - 1];
    
    // Get the fields to validate based on the step
    let fieldsToValidate: string[] = [];
    if (step === 1) {
      fieldsToValidate = ['name', 'hole_number', 'description'];
    } else if (step === 2) {
      fieldsToValidate = ['start_date', 'end_date'];
    } else if (step === 3) {
      fieldsToValidate = ['entry_fee', 'visibility_notes'];
    }
    
    const currentData = Object.fromEntries(
      Object.entries(watchedValues).filter(([key]) => 
        fieldsToValidate.includes(key)
      )
    );

    const result = currentSchema.safeParse(currentData);
    
    if (!result.success) {
      result.error.errors.forEach(error => {
        form.setError(error.path[0] as keyof FormData, { message: error.message });
      });
      return false;
    }

    // Check for schedule overlaps in step 2
    if (step === 2) {
      const hasOverlap = await checkForOverlaps(
        watchedValues.hole_number,
        watchedValues.start_date,
        watchedValues.end_date
      );
      // Allow proceeding even with overlap (just show warning)
    }

    return true;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Determine status based on current time
      const now = new Date();
      const status = (now >= data.start_date && now <= data.end_date) ? 'ACTIVE' : 'SCHEDULED';

      // Convert entry fee to cents
      const entry_fee_cents = Math.round(data.entry_fee * 100);

      const { data: competition, error } = await supabase
        .from('competitions')
        .insert({
          club_id: clubId,
          name: data.name,
          hole_number: data.hole_number,
          description: data.description,
          start_date: data.start_date.toISOString(),
          end_date: data.end_date.toISOString(),
          entry_fee: entry_fee_cents,
          status,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Challenge Created!',
        description: 'Your Hole in 1 Challenge has been published successfully.',
      });

      navigate(`/dashboard/club/competitions/${competition.id}`);
    } catch (error) {
      console.error('Error creating competition:', error);
      toast({
        title: 'Error',
        description: 'Failed to create competition. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Competition Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., Weekend Hole in 1 Challenge"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="hole_number">Hole Number</Label>
              <Input
                id="hole_number"
                type="number"
                min="1"
                max="18"
                {...form.register('hole_number', { valueAsNumber: true })}
              />
              {form.formState.errors.hole_number && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.hole_number.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Prize Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Describe the prize or what players can win..."
                rows={4}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {overlapWarning && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning-foreground">
                {overlapWarning}
              </div>
            )}

            <div>
              <Label>Start Date & Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchedValues.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchedValues.start_date ? format(watchedValues.start_date, "PPp") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchedValues.start_date}
                    onSelect={(date) => form.setValue('start_date', date || new Date())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.start_date && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.start_date.message}</p>
              )}
            </div>

            <div>
              <Label>End Date & Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watchedValues.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchedValues.end_date ? format(watchedValues.end_date, "PPp") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchedValues.end_date}
                    onSelect={(date) => form.setValue('end_date', date || new Date())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.end_date && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.end_date.message}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="entry_fee">Entry Fee (£)</Label>
              <Input
                id="entry_fee"
                type="number"
                min="0"
                step="0.01"
                {...form.register('entry_fee', { valueAsNumber: true })}
                placeholder="0.00"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Set to 0 for a free competition
              </p>
              {form.formState.errors.entry_fee && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.entry_fee.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="visibility_notes">Internal Notes (Optional)</Label>
              <Textarea
                id="visibility_notes"
                {...form.register('visibility_notes')}
                placeholder="Private notes for club use only..."
                rows={3}
              />
              <p className="text-sm text-muted-foreground mt-1">
                These notes are only visible to club administrators
              </p>
              {form.formState.errors.visibility_notes && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.visibility_notes.message}</p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg">Competition Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{watchedValues.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hole Number</p>
                  <p className="font-medium">{watchedValues.hole_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prize</p>
                  <p className="font-medium">{watchedValues.description}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entry Fee</p>
                  <p className="font-medium">
                    {watchedValues.entry_fee === 0 ? 'Free' : formatCurrency(watchedValues.entry_fee * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start</p>
                  <p className="font-medium">{format(watchedValues.start_date, "PPp")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End</p>
                  <p className="font-medium">{format(watchedValues.end_date, "PPp")}</p>
                </div>
              </div>

              {watchedValues.visibility_notes && (
                <div>
                  <p className="text-muted-foreground">Internal Notes</p>
                  <p className="font-medium text-sm">{watchedValues.visibility_notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary-foreground">
                <strong>Ready to publish?</strong> Your competition will be immediately available at the share link 
                and players can start entering if the dates are active.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    'Competition Details',
    'Schedule',
    'Pricing & Settings',
    'Review & Publish'
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Create New Challenge</CardTitle>
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of 4
          </span>
        </div>
        <Progress value={(currentStep / 4) * 100} className="mt-2" />
        <p className="text-muted-foreground">{stepTitles[currentStep - 1]}</p>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {renderStep()}

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
              >
                {loading ? 'Publishing...' : 'Publish Challenge'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CompetitionWizard;