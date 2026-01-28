'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Sun, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function MarketplacePage() {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const token = await getToken();
        if (!token) return;
        const response = await api.getMarketplace(token);
        setProjects(response.data || []);
      } catch (error) {
        console.error('Failed to fetch marketplace:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [getToken]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-96 animate-pulse bg-card/20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Solar Marketplace</h1>
        <p className="text-muted-foreground text-lg">Browse and invest in vetted renewable energy projects.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="bg-card/30 backdrop-blur-xl border-white/5 group hover:border-primary/50 transition-all overflow-hidden shadow-2xl">
            <div className="aspect-video relative bg-muted overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
               <Sun className="absolute inset-0 m-auto h-12 w-12 text-white/20" />
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl text-white group-hover:text-primary transition-colors">{project.name}</CardTitle>
                <span className="text-primary font-bold">{project.expectedYield}% APY</span>
              </div>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {project.location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Funding progress</span>
                  <span className="text-white font-medium">{Math.round(project.fundingPercentage)}%</span>
                </div>
                <Progress value={project.fundingPercentage} className="h-2" />
                <div className="flex justify-between text-xs pt-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold">Goal</span>
                    <span className="text-white font-semibold">{formatCurrency(project.fundingTarget)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold">Price</span>
                    <span className="text-white font-semibold">{formatCurrency(project.pricePerToken)}/unit</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/dashboard/marketplace/${project.id}`} className="w-full">
                <Button className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border-primary/20 transition-all">
                  View Opportunity
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
