"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PortfolioChart } from "@/components/dashboard/charts/portfolio-chart";
import { AllocationChart } from "@/components/dashboard/charts/allocation-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TopAssets } from "@/components/dashboard/top-assets";
import { ImpactMetrics } from "@/components/dashboard/impact-metrics";
import { Sun, Coins, Zap, TrendingUp, Loader2 } from "lucide-react";
import { usePortfolio, useYields } from "@/hooks/use-dashboard-data";

export function PortfolioSection() {
  const { portfolio, loading: portfolioLoading } = usePortfolio();
  const { summary: yieldSummary, loading: yieldLoading } = useYields();

  const loading = portfolioLoading || yieldLoading;

  // Calculate portfolio metrics
  const totalValue = portfolio?.totalInvested || 0;
  const totalYield = yieldSummary?.totalClaimed || 0;
  const activeInvestments = portfolio?.investments?.length || 0;
  const claimableRewards = yieldSummary?.totalPending || 0;

  // Derived Transactions
  // Map investments to transaction format for display
  const recentInvestmentTransactions =
    portfolio?.investments?.map((inv: any) => ({
      id: inv.id,
      type: "investment" as const,
      project: inv.project?.name || "Solar Project",
      amount: Number(inv.amount),
      date: new Date(inv.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      status: inv.status.toLowerCase() as "completed" | "pending",
    })) || [];

  const getDisplayStatus = (status: string): "completed" | "pending" => {
    if (status === "CONFIRMED" || status === "SUCCESS") return "completed";
    return "pending";
  };

  const transactions = [
    ...(yieldSummary?.recentClaims || []).map((c: any) => ({
      id: c.id,
      type: "yield" as const,
      project: c.projectName || "Solar Yield",
      amount: Number(c.amount),
      date: new Date(c.createdAt).toLocaleDateString(),
      status: "completed" as const,
    })),
    ...(portfolio?.investments || []).map((i: any) => ({
      id: i.id,
      type: "investment" as const,
      project: i.project?.name || "Solar Project",
      amount: Number(i.amount),
      date: new Date(i.createdAt).toLocaleDateString(),
      status: getDisplayStatus(i.status),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Derived Top Assets
  const topAssets = (portfolio?.investments || [])
    .map((i: any) => ({
      id: i.id,
      name: i.project?.name || "Solar Project",
      value: Number(i.amount),
      yield: i.project?.expectedYield || 10,
      change: 0,
      color:
        i.project?.status === "ACTIVE"
          ? "from-emerald-500 to-green-600"
          : "from-blue-500 to-indigo-600",
      pending: i.status === "PENDING" || i.status === "PENDING_ONCHAIN",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Derived Allocation
  const CHART_COLORS = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];
  const allocationData = (portfolio?.investments || []).reduce(
    (acc: any[], current: any) => {
      const existing = acc.find((item) => item.name === current.project?.name);
      if (existing) {
        existing.value += Number(current.amount);
      } else {
        acc.push({
          name: current.project?.name || "Other",
          value: Number(current.amount),
          color: CHART_COLORS[acc.length % CHART_COLORS.length],
        });
      }
      return acc;
    },
    [],
  );

  // Derived Impact Data - Use API data with fallback
  const impactData = {
    carbonOffset: portfolio?.impact?.carbonOffset || 0,
    treesPlanted: portfolio?.impact?.treesPlanted || 0,
    waterSaved: portfolio?.impact?.waterSaved || 0,
    cleanEnergy: portfolio?.impact?.cleanEnergy || 0,
  };

  // Derived Chart Data (Mocking historical trend relative to current total)
  const chartData = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"].map(
    (month, idx) => ({
      month,
      value: totalValue * (0.85 + idx * 0.025),
    }),
  );

  return (
    <div className="space-y-6">
      {/* Loading overlay */}
      {loading && !portfolio && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading portfolio...
          </span>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Portfolio Value"
          value={loading ? "..." : `$${totalValue.toLocaleString()}`}
          change={"—"}
          changeType={"neutral"}
          icon={Sun}
          delay={0}
          gradient="solar"
        />
        <MetricCard
          title="Total Yield Earned"
          value={loading ? "..." : `$${totalYield.toLocaleString()}`}
          change={"—"}
          changeType={"neutral"}
          icon={Coins}
          delay={1}
          gradient="energy"
        />
        <MetricCard
          title="Active Investments"
          value={loading ? "..." : activeInvestments.toString()}
          change={activeInvestments > 0 ? `${activeInvestments} projects` : "0"}
          changeType="neutral"
          icon={Zap}
          delay={2}
          gradient="investment"
        />
        <MetricCard
          title="Claimable Rewards"
          value={loading ? "..." : `$${claimableRewards.toFixed(2)}`}
          change={claimableRewards > 0 ? "Ready to claim" : "--"}
          changeType={claimableRewards > 0 ? "positive" : "neutral"}
          icon={TrendingUp}
          delay={3}
          gradient="yield"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PortfolioChart data={chartData} loading={loading} />
        </div>
        <AllocationChart data={allocationData} loading={loading} />
      </div>

      {/* Impact row */}
      <ImpactMetrics data={impactData} loading={loading} />

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={transactions} loading={loading} />
        <TopAssets assets={topAssets} loading={loading} />
      </div>
    </div>
  );
}
