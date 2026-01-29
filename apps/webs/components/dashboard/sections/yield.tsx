"use client";

import { useState } from "react";
import { YieldChart } from "@/components/dashboard/charts/yield-chart";
import { cn } from "@/lib/utils";
import { Coins, ArrowUpRight, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const yieldHistory: { id: string; project: string; amount: number; date: string; status: "claimed" | "pending" | "failed" }[] = [];

const pendingYields: { id: string; project: string; amount: number; readyDate: string }[] = [];

const statusConfig = {
    claimed: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

export function YieldSection() {
    const [isClaiming, setIsClaiming] = useState(false);

    const totalClaimable = pendingYields.reduce((sum, y) => sum + y.amount, 0);
    const totalClaimed = yieldHistory.reduce((sum, y) => sum + y.amount, 0);

    const handleClaimAll = async () => {
        setIsClaiming(true);
        // Simulate claiming
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsClaiming(false);
    };

    return (
        <div className="space-y-6">
            {/* Claimable yield card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 sm:p-8">
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
                            From {pendingYields.length} projects • Ready to claim
                        </p>
                    </div>

                    <button
                        onClick={handleClaimAll}
                        disabled={isClaiming || totalClaimable === 0}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200",
                            isClaiming
                                ? "bg-white/50 text-emerald-900 cursor-wait"
                                : "bg-white text-emerald-600 hover:bg-white/90 hover:scale-105"
                        )}
                    >
                        {isClaiming ? (
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
                    <p className="text-2xl font-bold">$0.00</p>
                    <p className="text-xs text-muted-foreground mt-1">No yield this month</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-sm text-muted-foreground mb-1">Average Yield</p>
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-xs text-muted-foreground mt-1">Annualized return</p>
                </div>
            </div>

            {/* Yield chart and pending list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <YieldChart />
                </div>

                {/* Pending yields breakdown */}
                <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-semibold mb-4">Pending Yields</h3>
                    <div className="space-y-3">
                        {pendingYields.map((yield_) => (
                            <div
                                key={yield_.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                            >
                                <div>
                                    <p className="font-medium text-sm">{yield_.project}</p>
                                    <p className="text-xs text-muted-foreground">Ready {yield_.readyDate}</p>
                                </div>
                                <span className="font-semibold text-success">+${yield_.amount.toFixed(2)}</span>
                            </div>
                        ))}
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
                        <thead className="bg-secondary/50">
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
                            {yieldHistory.map((yield_) => {
                                const config = statusConfig[yield_.status];
                                const StatusIcon = config.icon;

                                return (
                                    <tr key={yield_.id} className="hover:bg-secondary/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-sm">{yield_.project}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm text-muted-foreground">{yield_.date}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-success">+${yield_.amount.toFixed(2)}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                                config.bg,
                                                config.color
                                            )}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {yield_.status.charAt(0).toUpperCase() + yield_.status.slice(1)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
