'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { TrendingUp, Wallet, Sun, BarChart3, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const role = (user?.publicMetadata?.role as string) || 'INVESTOR';

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        if (!token) return;

        if (role === 'INVESTOR') {
          const res = await fetchApi('/users/portfolio', token);
          setData(res.data);
        } else if (role === 'INSTALLER') {
          const res = await fetchApi('/projects/my/projects', token);
          setData(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      fetchData();
    }
  }, [user, role, getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Investor View
  if (role === 'INVESTOR') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Portfolio Overview</h1>
          <p className="text-muted-foreground text-lg">Manage your solar investments and track yields.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Invested</CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data?.totalInvested || 0)}</div>
             </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Yield Received</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold text-green-400">{formatCurrency(data?.totalYieldReceived || 0)}</div>
             </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Installer View (Redirect to installer dashboard if navigated wrongly)
  return null;
}
