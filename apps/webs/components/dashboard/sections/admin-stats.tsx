"use client";

import { useState } from "react";
import {
  TrendingUp,
  Users,
  Zap,
  DollarSign,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useAdminStats } from "@/hooks/use-dashboard-data";

export function AdminStatsSection() {
  const { stats: apiStats, loading, error } = useAdminStats();
  const [_timePeriod, setTimePeriod] = useState("6m");

  const stats = [
    {
      label: "Total Funding Raised",
      value: apiStats
        ? apiStats.funding.totalRaised >= 1000000
          ? `$${(apiStats.funding.totalRaised / 1000000).toFixed(2)}M`
          : `$${(apiStats.funding.totalRaised / 1000).toFixed(1)}K`
        : "$0.0K",
      change: `${apiStats?.projects.funded || 0} funded`,
      positive: true,
      icon: DollarSign,
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/20",
    },
    {
      label: "Active Projects",
      value: apiStats ? apiStats.projects.active.toString() : "0",
      change: `+${apiStats?.projects.pending || 0} pending`,
      positive: true,
      icon: Zap,
      color: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/20",
    },
    {
      label: "Total Users",
      value: apiStats ? apiStats.users.total.toLocaleString() : "0",
      change: `${apiStats?.users.installers || 0} installers`,
      positive: true,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "KYC Pending Review",
      value: apiStats ? apiStats.kyc.pendingReview.toString() : "0",
      change: "Action needed",
      positive: (apiStats?.kyc.pendingReview || 0) === 0,
      icon: TrendingUp,
      color: "from-purple-500 to-violet-600",
      shadow: "shadow-purple-500/20",
    },
  ];

  // Build chart from real project status distribution
  const chartData = apiStats
    ? [
        { name: "Pending", projects: apiStats.projects.pending || 0 },
        { name: "Funding", projects: apiStats.projects.funding || 0 },
        { name: "Funded", projects: apiStats.projects.funded || 0 },
        { name: "Active", projects: apiStats.projects.active || 0 },
        { name: "Completed", projects: apiStats.projects.completed || 0 },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-500 font-medium">
          Loading platform metrics...
        </p>
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
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                    stat.color,
                    stat.shadow,
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                    stat.positive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600",
                  )}
                >
                  {stat.positive ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {stat.change}
                </div>
              </div>
              <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
              <h4 className="text-3xl font-black text-zinc-900 mt-1">
                {stat.value}
              </h4>
            </div>
          );
        })}
      </div>

      {/* Performance Chart */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">
              Project Pipeline
            </h3>
            <p className="text-sm text-zinc-500">
              Current project distribution by status.
            </p>
          </div>
          <select
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            onChange={(e) => setTimePeriod(e.target.value)}
          >
            <option value="6m">Current Snapshot</option>
            <option value="1y">All Statuses</option>
          </select>
        </div>

        {chartData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500">
                No project data available yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorProjects"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    border: "1px solid #e4e4e7",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="projects"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorProjects)"
                  name="Projects"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
