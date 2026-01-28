'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import { Sun, User, Building, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<'INVESTOR' | 'INSTALLER'>('INVESTOR');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Sync user with backend and set role
      await fetchApi('/auth/sync', token, {
        method: 'POST',
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName,
          role: role,
          company: role === 'INSTALLER' ? company : undefined,
        }),
      });

      // Update Clerk metadata as well for frontend consistency
      await user?.update({
        unsafeMetadata: {
          role,
          onboardingComplete: true,
        },
      });
      
      toast({ title: 'Welcome to Aethera!', description: `You're all set as an ${role.toLowerCase()}.` });
      
      // Redirect based on role
      if (role === 'INSTALLER') {
        router.push('/installer');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Onboarding failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete onboarding.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solar-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Sun className="h-10 w-10 text-solar-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-solar-500 to-stellar-500 bg-clip-text text-transparent">
              Aethera
            </span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome, {user?.firstName || 'there'}!</CardTitle>
            <CardDescription>Let's set up your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-3">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('INVESTOR')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
                      role === 'INVESTOR'
                        ? 'border-solar-500 bg-solar-500/10 text-solar-500'
                        : 'border-input hover:border-solar-500/50'
                    )}
                  >
                    <User className="h-6 w-6" />
                    <span className="text-sm font-medium">Investor</span>
                    <span className="text-xs text-muted-foreground">Invest in solar projects</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('INSTALLER')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
                      role === 'INSTALLER'
                        ? 'border-stellar-500 bg-stellar-500/10 text-stellar-500'
                        : 'border-input hover:border-stellar-500/50'
                    )}
                  >
                    <Building className="h-6 w-6" />
                    <span className="text-sm font-medium">Installer</span>
                    <span className="text-xs text-muted-foreground">Get project financing</span>
                  </button>
                </div>
              </div>

              {/* Company name for installers */}
              {role === 'INSTALLER' && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Solar Solutions Inc."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                variant={role === 'INVESTOR' ? 'solar' : 'stellar'}
                className="w-full gap-2"
                disabled={loading || (role === 'INSTALLER' && !company)}
              >
                {loading ? 'Setting up...' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
