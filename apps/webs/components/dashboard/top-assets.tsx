"use client";

import { Sun, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const topAssets: { id: string; name: string; value: number; yield: number; change: number; color: string; pending?: boolean }[] = [];

export function TopAssets() {
    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Top Performing Assets</h3>
                <button className="text-sm text-accent hover:underline">View All</button>
            </div>

            <div className="space-y-3">
                {topAssets.map((asset, index) => (
                    <div
                        key={asset.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                                asset.color
                            )}>
                                <Sun className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{asset.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    ${asset.value.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            {asset.pending ? (
                                <span className="text-xs text-amber-500 font-medium">Pending</span>
                            ) : (
                                <>
                                    <p className="font-semibold text-sm text-success">
                                        {asset.yield}% APY
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-success">
                                        <TrendingUp className="w-3 h-3" />
                                        +{asset.change}%
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
