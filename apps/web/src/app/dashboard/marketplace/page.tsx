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
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          Solar Marketplace
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Browse and invest in vetted renewable energy projects globally.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="glass-card card-hover group border-none relative flex flex-col h-full">
            <div className="aspect-video relative overflow-hidden rounded-t-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-solar-500/20 to-stellar-500/20 z-10" />
              <img
                src="/images/solar-field.png"
                alt={project.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-black/20 z-0" />
              <div className="absolute top-4 right-4 z-20">
                <span className="px-3 py-1 rounded-full bg-solar-500 text-white text-xs font-bold shadow-lg">
                  {project.expectedYield}% APY
                </span>
              </div>
            </div>

            <CardHeader className="flex-1">
              <div className="space-y-1">
                <CardTitle className="text-xl text-white group-hover:text-solar-400 transition-colors">
                  {project.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.location}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end text-sm">
                  <span className="text-muted-foreground font-medium">Funding Progress</span>
                  <span className="text-white font-bold">{Math.round(project.fundingPercentage)}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-solar-600 via-solar-500 to-amber-400 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                    style={{ width: `${project.fundingPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Goal</span>
                  <span className="text-white font-semibold flex items-center gap-1">
                    {formatCurrency(project.fundingTarget)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Price</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(project.pricePerToken)}<span className="text-muted-foreground font-normal text-[10px]/none ml-0.5">/unit</span>
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 pb-6 px-6">
              <Link href={`/dashboard/marketplace/${project.id}`} className="w-full">
                <Button className="w-full bg-white/5 hover:bg-solar-500 text-white hover:text-white border border-white/10 hover:border-solar-500 transition-all duration-300 h-11 rounded-xl group/btn">
                  View Opportunity
                  <Sun className="ml-2 h-4 w-4 group-hover/btn:rotate-90 transition-transform duration-500" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
