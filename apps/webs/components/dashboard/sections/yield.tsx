"use client";

import { YieldChart } from "@/components/dashboard/charts/yield-chart";
import { cn } from "@/lib/utils";
import {
  Coins,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { useYields } from "@/hooks/use-dashboard-data";

const statusConfig = {
  claimed: {
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    label: "Claimed",
  },
  pending: {
    icon: Clock,
    color: "text-amber-700",
    bg: "bg-amber-100",
    label: "Pending",
  },
  failed: {
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-100",
    label: "Failed",
  },
};

export function YieldSection() {
  const { summary, pendingClaims, loading, claiming, claimAll, refetch } =
    useYields();

  const totalClaimable = summary?.totalPending || 0;
  const totalClaimed = summary?.totalClaimed || 0;

  const now = new Date();
  const thisMonth = (summary?.recentClaims || []).reduce(
    (acc: number, claim: any) => {
      const d = new Date(claim.claimedAt || claim.createdAt);
      if (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        return acc + Number(claim.amount);
      }
      return acc;
    },
    0,
  );

  const monthlyData = (summary?.recentClaims || []).reduce(
    (acc: any, claim: any) => {
      const date = new Date(claim.claimedAt || claim.createdAt);
      const month = date.toLocaleString("default", { month: "short" });
      const projectName = claim.project?.name || "Other";
      if (!acc[month]) acc[month] = { month };
      acc[month][projectName] =
        (acc[month][projectName] || 0) + Number(claim.amount);
      return acc;
    },
    {},
  );

  const chartData = Object.values(monthlyData).slice(-6) as any[];

  const handleClaimAll = async () => {
    await claimAll();
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-16 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-500">Loading yield data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Claimable yield hero */}
      <div className="relative bg-emerald-600 rounded-2xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-80" />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/10 rounded-full" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-white/80" />
              <span className="text-white/80 text-sm font-medium">
                Claimable Yield
              </span>
            </div>
            <p className="text-4xl sm:text-5xl font-bold text-white mb-2 tabular-nums">
              ${totalClaimable.toFixed(2)}
            </p>
            <p className="text-white/70 text-sm">
              From {pendingClaims.length} project
              {pendingClaims.length !== 1 ? "s" : ""} · Ready to claim
            </p>
          </div>

          <button
            onClick={handleClaimAll}
            disabled={claiming || totalClaimable === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
              claiming
                ? "bg-white/60 text-emerald-900 cursor-wait"
                : totalClaimable === 0
                  ? "bg-white/30 text-white/60 cursor-not-allowed"
                  : "bg-white text-emerald-700 hover:bg-white/90 hover:shadow-lg",
            )}
          >
            {claiming ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" />
                Claim All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Claimed",
            value: `$${totalClaimed.toFixed(2)}`,
            sub: "Lifetime earnings",
            icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "This Month",
            value: `$${thisMonth.toFixed(2)}`,
            sub:
              thisMonth > 0 ? "Current month earnings" : "No yield this month",
            icon: CalendarDays,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Average Yield",
            value: totalClaimed > 0 ? "~12%" : "0%",
            sub: "Annualized return",
            icon: BarChart3,
            color: "bg-violet-50 text-violet-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-zinc-100 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  stat.color,
                )}
              >
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-sm text-zinc-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">
              {stat.value}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + pending breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <YieldChart data={chartData} loading={loading} />
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-zinc-400" />
            <h3 className="font-semibold text-zinc-900 text-sm">
              Pending Yields
            </h3>
          </div>
          <div className="space-y-2">
            {pendingClaims.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">
                No pending yields
              </p>
            ) : (
              pendingClaims.map((yieldClaim) => (
                <div
                  key={yieldClaim.id}
                  className="flex items-center justify-between px-3 py-3 rounded-xl bg-zinc-50"
                >
                  <div>
                    <p className="font-medium text-sm text-zinc-900">
                      {yieldClaim.project?.name || "Solar Project"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(yieldClaim.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600 text-sm tabular-nums">
                    +${Number(yieldClaim.amount).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Yield history table */}
      <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">Yield History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                {["Project", "Date", "Amount", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {summary?.recentClaims && summary.recentClaims.length > 0 ? (
                summary.recentClaims.map((yieldClaim) => {
                  const status = yieldClaim.claimed ? "claimed" : "pending";
                  const config = statusConfig[status];
                  const StatusIcon = config.icon;
                  return (
                    <tr
                      key={yieldClaim.id}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-sm text-zinc-900">
                          {yieldClaim.project?.name || "Solar Project"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-zinc-500">
                          {new Date(
                            yieldClaim.claimedAt || yieldClaim.createdAt,
                          ).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-emerald-600 text-sm tabular-nums">
                          +${Number(yieldClaim.amount).toFixed(2)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            config.bg,
                            config.color,
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-zinc-400"
                  >
                    No yield history yet. Yield will appear here once projects
                    start producing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
