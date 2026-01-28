'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Sun, MapPin, Calculator, BadgeDollarSign, Calendar, Info } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetchApi(`/projects/${params.id}`, token);
        setProject(res.data);
      } catch (error) {
        console.error('Failed to load project:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [params.id, getToken]);

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-10 w-48 bg-card/20 rounded" />
      <div className="h-96 w-full bg-card/20 rounded-xl" />
    </div>;
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Project not found</h2>
        <Button variant="link" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="hover:bg-zinc-100">
          <ChevronLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-1">{project.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{project.location}, {project.country}</span>
          </div>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border ${project.status === 'FUNDING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
            {project.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <Card className="glass-card shadow-2xl overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-b border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent opacity-60" />
              <Sun className="h-20 w-20 text-white/50 relative z-10" />
            </div>
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                About this Project
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg whitespace-pre-wrap italic">
                "{project.description}"
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
                  <Calculator className="h-4 w-4 text-primary" />
                  Technical Specs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="text-muted-foreground text-sm">Capacity</span>
                  <span className="text-foreground font-semibold">{project.capacity} kW</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="text-muted-foreground text-sm">Panel Type</span>
                  <span className="text-foreground font-semibold">{project.panelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Inverter</span>
                  <span className="text-foreground font-semibold">{project.inverterType}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground text-sm">Submitted</span>
                  <span className="text-foreground font-semibold">{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Est. Completion</span>
                  <span className="text-foreground font-semibold">{project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate).toLocaleDateString() : 'TBD'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="glass-card shadow-[0_0_50px_rgba(var(--primary),0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <BadgeDollarSign className="h-12 w-12 text-primary/10" />
            </div>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Funding Status</CardTitle>
              <div className="pt-2">
                <span className="text-4xl font-black text-foreground">${Number(project.fundingRaised).toLocaleString()}</span>
                <span className="text-muted-foreground ml-2">/ ${Number(project.fundingTarget).toLocaleString()}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                  <span className="text-muted-foreground">Raised</span>
                  <span className="text-primary">{Math.round(project.fundingPercentage)}%</span>
                </div>
                <Progress value={project.fundingPercentage} className="h-3 bg-white/5" indicatorClassName="bg-gradient-to-r from-primary/80 to-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Tokens</p>
                  <p className="text-xl font-bold text-foreground tracking-tight">{project.totalTokens.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Yield</p>
                  <p className="text-xl font-bold text-primary tracking-tight">{project.expectedYield}% APY</p>
                </div>
              </div>

              {project.status === 'PENDING_APPROVAL' && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm flex gap-3">
                  <Info className="h-5 w-5 shrink-0" />
                  <p>Our audit team is reviewing your project. This usually takes 24-48 hours.</p>
                </div>
              )}

              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 shadow-xl shadow-primary/20 transition-all active:scale-95" disabled>
                Manage Asset
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card p-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Token Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-lg font-black tracking-tighter text-foreground">{project.tokenSymbol}</span>
                <span className="text-xs font-mono text-muted-foreground">Asset Token</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
