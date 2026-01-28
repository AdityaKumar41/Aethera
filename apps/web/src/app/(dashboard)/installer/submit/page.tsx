'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ChevronRight, ChevronLeft, Sun, Globe, FileText, BadgeDollarSign, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().min(50, 'Description must be at least 50 characters').max(5000),
  location: z.string().min(3),
  country: z.string().min(2, 'Country is required'),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1 kW'),
  panelType: z.string().optional(),
  inverterType: z.string().optional(),
  estimatedAnnualProduction: z.coerce.number().optional(),
  expectedYield: z.coerce.number().min(1, 'Yield must be at least 1%').max(30),
  fundingTarget: z.coerce.number().min(100, 'Target must be at least $100'),
  pricePerToken: z.coerce.number().min(1, 'Price must be at least $1'),
  estimatedCompletionDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SubmitProjectPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      country: '',
      capacity: 0,
      panelType: 'Monocrystalline',
      inverterType: 'String Inverter',
      expectedYield: 8.5,
      fundingTarget: 0,
      pricePerToken: 1,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      await fetchApi('/projects', token, {
        method: 'POST',
        body: JSON.stringify(values),
      });

      toast({
        title: 'Success!',
        description: 'Your project has been submitted for approval.',
      });
      router.push('/installer');
    } catch (error) {
      console.error('Submission failed:', error);
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextStep = () => {
    const fields = step === 1 ? ['name', 'description', 'location', 'country'] :
      step === 2 ? ['capacity', 'panelType', 'inverterType'] : [];

    form.trigger(fields as any).then((isValid) => {
      if (isValid) setStep((s) => s + 1);
    });
  };

  const prevStep = () => setStep((s) => s - 1);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="hover:bg-zinc-100">
          <ChevronLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Post New Project</h1>
      </div>

      <div className="flex justify-between items-center px-4 mb-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'bg-primary text-primary-foreground scale-110 shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'bg-zinc-100 text-muted-foreground'
              }`}>
              {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
            </div>
            {s < 3 && <div className={`w-12 md:w-24 h-[2px] ${step > s ? 'bg-primary' : 'bg-zinc-100'}`} />}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <Card className="glass-card animate-in slide-in-from-right-4 duration-300">
              <CardHeader className="bg-primary/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
                <CardDescription>Tell us about the project and its location.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sunnyvale Solar Farm" {...field} className="bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a detailed description of the project, its goals, and impact..."
                          className="min-h-[150px] bg-zinc-50 border-zinc-200 focus:border-primary/50"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>At least 50 characters.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="City, State" {...field} className="bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="Country" {...field} className="bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="glass-card animate-in slide-in-from-right-4 duration-300">
              <CardHeader className="bg-primary/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-primary" />
                  Technical Specifications
                </CardTitle>
                <CardDescription>Details about the solar infrastructure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Capacity (kW)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="panelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Panel Type</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inverterType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inverter Type</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="estimatedAnnualProduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Annual Production (kWh)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="glass-card animate-in slide-in-from-right-4 duration-300">
              <CardHeader className="bg-primary/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <BadgeDollarSign className="h-5 w-5 text-primary" />
                  Financial Details
                </CardTitle>
                <CardDescription>Funding targets and investor returns.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <FormField
                  control={form.control}
                  name="fundingTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Target (USDC)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                          <Input type="number" {...field} className="pl-7 bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Token (USDC)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input type="number" {...field} className="pl-7 bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                          </div>
                        </FormControl>
                        <FormDescription>Min 1 USDC</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expectedYield"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Annual Yield (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" step="0.1" {...field} className="bg-zinc-50 border-zinc-200 focus:border-primary/50" />
                            <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center pt-8">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 1 || isSubmitting}
              className="border-zinc-200 hover:bg-zinc-50 text-foreground"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>

            {step < 3 ? (
              <Button type="button" onClick={nextStep} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 shadow-lg shadow-primary/20 animate-pulse-subtle">
                {isSubmitting ? 'Submitting...' : 'Launch Project'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
