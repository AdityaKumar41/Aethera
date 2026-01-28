'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Sun, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function InstallerDashboard() {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetchApi('/projects/my/projects', token);
        setProjects(res.data);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [getToken]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Installer Dashboard</h1>
          <p className="text-muted-foreground text-lg">Manage your solar projects and track funding progress.</p>
        </div>
        <Link href="/installer/submit">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <PlusCircle className="mr-2 h-5 w-5" />
            Submit Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Sun className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">Active submissions</p>
          </CardContent>
        </Card>
        <Card className="glass-card transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Funding Goal</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${projects.reduce((sum, p) => sum + Number(p.fundingTarget), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Combined targets</p>
          </CardContent>
        </Card>
        <Card className="glass-card transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">USDC available</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Your Projects</h2>
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-48 animate-pulse bg-card/20 border-border/10" />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="glass-card group hover:shadow-2xl hover:shadow-primary/5 transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{project.name}</CardTitle>
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${project.status === 'FUNDING' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <CardDescription>{project.location}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Funding progress</span>
                      <span className="font-medium text-foreground">{Math.round(project.fundingPercentage)}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                        style={{ width: `${project.fundingPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Target Yield</p>
                        <p className="text-lg font-bold text-primary">{project.expectedYield}% APY</p>
                      </div>
                      <Link href={`/installer/projects/${project.id}`}>
                        <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary transition-all">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 border-dashed border-border/50 bg-transparent flex flex-col items-center justify-center text-center">
            <Sun className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">Start your journey by submitting your first renewable energy project for funding.</p>
            <Link href="/installer/submit">
              <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                Submit Your First Project
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
