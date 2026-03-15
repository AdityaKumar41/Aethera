"use client";

import { Sun, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Asset {
  id: string;
  name: string;
  value: number;
  yield: number;
  change: number;
  color: string;
  pending?: boolean;
}

interface TopAssetsProps {
  assets?: Asset[];
  loading?: boolean;
}

export function TopAssets({ assets = [], loading }: TopAssetsProps) {
  if (loading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Top Performing Assets</h3>
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
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Top Performing Assets</h3>
        <Link
          href="/dashboard/my-investments"
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {assets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500">No active assets</p>
          </div>
        ) : (
          assets.map((asset, index) => (
            <div
              key={asset.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br shadow-lg",
                    asset.color,
                  )}
                >
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{asset.name}</p>
                  <p className="text-xs text-zinc-500">
                    ${asset.value.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {asset.pending ? (
                  <span className="text-xs text-amber-500 font-medium">
                    Pending
                  </span>
                ) : (
                  <>
                    <p className="font-semibold text-sm text-success">
                      {asset.yield}% APY
                    </p>
                    <div className="flex items-center gap-1 text-xs text-success">
                      <TrendingUp className="w-3 h-3" />+{asset.change}%
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
