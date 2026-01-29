"use client";

import { useState } from "react";
import { YieldChart } from "@/components/dashboard/charts/yield-chart";
import { cn } from "@/lib/utils";
import { Coins, ArrowUpRight, Clock, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { useYields } from "@/hooks/use-dashboard-data";

const statusConfig = {
    claimed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
    pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
    failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
};

export function YieldSection() {
    const { summary, pendingClaims, loading, claiming, claimAll, refetch } = useYields();

    const totalClaimable = summary?.totalPending || 0;
    const totalClaimed = summary?.totalClaimed || 0;
    
    // Calculate "This Month" yield
    const now = new Date();
    const thisMonth = (summary?.recentClaims || []).reduce((acc: number, claim: any) => {
        const claimDate = new Date(claim.claimedAt || claim.createdAt);
        if (claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear()) {
            return acc + Number(claim.amount);
        }
        return acc;
    }, 0);

    // Group yields by month and project for the chart
    const monthlyData = (summary?.recentClaims || []).reduce((acc: any, claim: any) => {
        const date = new Date(claim.claimedAt || claim.createdAt);
        const month = date.toLocaleString('default', { month: 'short' });
        const projectName = claim.project?.name || "Other";
        
        if (!acc[month]) acc[month] = { month };
        acc[month][projectName] = (acc[month][projectName] || 0) + Number(claim.amount);
        return acc;
    }, {});

    const chartData = Object.values(monthlyData).slice(-6) as any[]; // Last 6 months

    const handleClaimAll = async () => {
        const result = await claimAll();
        if (result.success) {
            // Show success toast or notification
        }
    };

    if (loading && !summary) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading yields...</span>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* Claimable yield card */}
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 sm:p-8">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Coins className="w-5 h-5 text-white/80" />
                            <span className="text-white/80 text-sm font-medium">Claimable Yield</span>
                        </div>
                        <p className="text-4xl sm:text-5xl font-bold text-white mb-2">
                            ${totalClaimable.toFixed(2)}
                        </p>
                        <p className="text-white/70 text-sm">
                            From {pendingClaims.length} projects • Ready to claim
                        </p>
                    </div>

                    <button
                        onClick={handleClaimAll}
                        disabled={claiming || totalClaimable === 0}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200",
                            claiming
                                ? "bg-white/50 text-emerald-900 cursor-wait"
                                : "bg-white text-emerald-600 hover:bg-white/90 hover:scale-105",
                            totalClaimable === 0 && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {claiming ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Claiming...
                            </>
                        ) : (
                            <>
                                <ArrowUpRight className="w-5 h-5" />
                                Claim All
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-sm text-muted-foreground mb-1">Total Claimed</p>
                    <p className="text-2xl font-bold">${totalClaimed.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lifetime yield earnings</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-sm text-muted-foreground mb-1">This Month</p>
                    <p className="text-2xl font-bold">${thisMonth.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {thisMonth > 0 ? "Current month earnings" : "No yield this month"}
                    </p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-sm text-muted-foreground mb-1">Average Yield</p>
                    <p className="text-2xl font-bold">
                        {totalClaimed > 0 ? "~12%" : "0%"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Annualized return</p>
                </div>
            </div>

            {/* Yield chart and pending list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <YieldChart data={chartData} loading={loading} />
                </div>

                {/* Pending yields breakdown */}
                <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-semibold mb-4">Pending Yields</h3>
                    <div className="space-y-3">
                        {pendingClaims.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No pending yields
                            </p>
                        ) : (
                            pendingClaims.map((yieldClaim) => (
                                <div
                                    key={yieldClaim.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50"
                                >
                                    <div>
                                        <p className="font-medium text-sm">{yieldClaim.project?.name || "Solar Project"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(yieldClaim.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className="font-semibold text-emerald-600">+${Number(yieldClaim.amount).toFixed(2)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Yield history */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h3 className="font-semibold">Yield History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                                    Project
                                </th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                                    Date
                                </th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                                    Amount
                                </th>
                                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {summary?.recentClaims && summary.recentClaims.length > 0 ? (
                                summary.recentClaims.map((yieldClaim) => {
                                    const status = yieldClaim.claimed ? "claimed" : "pending";
                                    const config = statusConfig[status];
                                    const StatusIcon = config.icon;

                                    return (
                                        <tr key={yieldClaim.id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-sm">{yieldClaim.project?.name || "Solar Project"}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(yieldClaim.claimedAt || yieldClaim.createdAt).toLocaleDateString()}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-emerald-600">+${Number(yieldClaim.amount).toFixed(2)}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                                    config.bg,
                                                    config.color
                                                )}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                                        No yield history yet
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
