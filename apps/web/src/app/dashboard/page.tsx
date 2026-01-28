"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { TrendingUp, Wallet, Sun, BarChart3, Building } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = (user?.publicMetadata?.role as string) || "INVESTOR";

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        if (!token) return;

        if (role === "INVESTOR") {
          const res = await fetchApi("/users/portfolio", token);
          setData(res.data);
        } else if (role === "INSTALLER") {
          const res = await fetchApi("/projects/my/projects", token);
          setData(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    if (user && mounted) {
      fetchData();
    }
  }, [user, role, getToken, mounted]);

  if (!mounted || !isLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Investor View
  if (role === "INVESTOR") {
    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Solar Portfolio
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Real-time monitoring of your renewable energy assets and automated yield distributions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card card-hover overflow-hidden group border-none relative">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sun className="h-24 w-24 text-solar-500 -mr-8 -mt-8 rotate-12" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Total Invested
              </CardTitle>
              <div className="p-2 rounded-lg bg-solar-500/10">
                <Wallet className="h-4 w-4 text-solar-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white tracking-tight">
                {formatCurrency(data?.totalInvested || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className="text-solar-500 font-medium">+2.4%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card card-hover overflow-hidden group border-none relative">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="h-24 w-24 text-emerald-500 -mr-8 -mt-8" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Total Yield
              </CardTitle>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-400 tracking-tight">
                {formatCurrency(data?.totalYieldReceived || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className="text-emerald-400 font-medium">+12.5%</span> APY Average
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card card-hover overflow-hidden group border-none relative">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Building className="h-24 w-24 text-stellar-500 -mr-8 -mt-8" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Active Assets
              </CardTitle>
              <div className="p-2 rounded-lg bg-stellar-500/10">
                <Sun className="h-4 w-4 text-stellar-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white tracking-tight">
                {data?.activeProjects || 4}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Distributed across 3 regions
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card card-hover overflow-hidden group border-none relative">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 className="h-24 w-24 text-purple-500 -mr-8 -mt-8" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Monthly Gen.
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BarChart3 className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white tracking-tight text-balance">
                12.4 <span className="text-sm font-normal text-muted-foreground">MWh</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Equivalent to 3.2k homes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Installer View (Redirect to installer dashboard if navigated wrongly)
  return null;
}
