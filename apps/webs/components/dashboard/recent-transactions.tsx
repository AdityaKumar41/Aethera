"use client";

import { ArrowUpRight, ArrowDownRight, Coins, Zap, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
    id: string;
    type: "yield" | "investment" | "claim";
    project: string;
    amount: number;
    date: string;
    status: "completed" | "pending";
}

const typeConfig = {
    yield: { icon: Coins, color: "bg-emerald-500/10 text-emerald-600", label: "Yield" },
    investment: { icon: TrendingUp, color: "bg-blue-500/10 text-blue-600", label: "Investment" },
    claim: { icon: ArrowUpRight, color: "bg-violet-500/10 text-violet-600", label: "Claim" },
};

interface RecentTransactionsProps {
    transactions?: Transaction[];
    loading?: boolean;
}

export function RecentTransactions({ transactions = [], loading }: RecentTransactionsProps) {
    if (loading) {
        return (
            <div className="bg-card border border-border rounded-2xl p-5 h-full">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Recent Transactions</h3>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-10 h-10 rounded-xl bg-secondary" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-secondary rounded w-2/3" />
                                <div className="h-3 bg-secondary rounded w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Recent Transactions</h3>
                <button className="text-sm text-accent hover:underline">View All</button>
            </div>

            <div className="space-y-3">
                {transactions.map((tx) => {
                    const config = typeConfig[tx.type];
                    const Icon = config.icon;
                    const isPositive = tx.amount > 0;

                    return (
                        <div
                            key={tx.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                config.color
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{tx.project}</p>
                                <p className="text-xs text-muted-foreground">{tx.date}</p>
                            </div>
                            <div className="text-right">
                                <p className={cn(
                                    "font-semibold text-sm",
                                    isPositive ? "text-success" : "text-foreground"
                                )}>
                                    {isPositive ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">{config.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
