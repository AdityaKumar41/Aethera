"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  Zap, 
  DollarSign, 
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const data = [
  { name: "Jan", funding: 120000, projects: 2 },
  { name: "Feb", funding: 250000, projects: 5 },
  { name: "Mar", funding: 480000, projects: 8 },
  { name: "Apr", funding: 390000, projects: 12 },
  { name: "May", funding: 720000, projects: 15 },
  { name: "Jun", funding: 950000, projects: 19 },
];

import { useAdminStats } from "@/hooks/use-dashboard-data";

export function AdminStatsSection() {
  const { stats: apiStats, loading, error } = useAdminStats();

  const stats = [
    {
      label: "Total Funding Raised",
      value: apiStats ? 
        apiStats.funding.totalRaised >= 1000000 
          ? `$${(apiStats.funding.totalRaised / 1000000).toFixed(2)}M`
          : `$${(apiStats.funding.totalRaised / 1000).toFixed(1)}K` 
        : "$0.0K",
      change: "+0%", // We'd need historical data for this
      positive: true,
      icon: DollarSign,
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/20"
    },
    {
      label: "Active Projects",
      value: apiStats ? apiStats.projects.active.toString() : "0",
      change: `+${apiStats?.projects.pending || 0} pending`,
      positive: true,
      icon: Zap,
      color: "from-solar-orange to-solar-gold",
      shadow: "shadow-amber-500/20"
    },
    {
      label: "Total Users",
      value: apiStats ? apiStats.users.total.toLocaleString() : "0",
      change: `Inst: ${apiStats?.users.installers || 0}`,
      positive: true,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20"
    },
    {
      label: "KYC Pending Review",
      value: apiStats ? apiStats.kyc.pendingReview.toString() : "0",
      change: "Action needed",
      positive: false,
      icon: TrendingUp,
      color: "from-purple-500 to-violet-600",
      shadow: "shadow-purple-500/20"
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-500 font-medium">Loading platform metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-3xl p-8 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Platform Analytics</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Market growth and platform performance metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="bg-white border border-zinc-200 rounded-3xl p-6 group hover:border-zinc-300 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl bg-linear-to-br flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                  stat.color,
                  stat.shadow
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                  stat.positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
              <h4 className="text-3xl font-black text-zinc-900 mt-1">{stat.value}</h4>
            </div>
          );
        })}
      </div>

      {/* Performance Chart */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Funding Volume</h3>
            <p className="text-sm text-zinc-500">Cumulative funding trends over the last 6 months.</p>
          </div>
          <select className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
            <option>Last 6 Months</option>
            <option>Last Year</option>
            <option>All Time</option>
          </select>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorFunding" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#a1a1aa', fontSize: 12}}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#a1a1aa', fontSize: 12}}
                tickFormatter={(value) => `$${value/1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="funding" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFunding)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
