"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { PortfolioChart } from "@/components/dashboard/charts/portfolio-chart";
import { AllocationChart } from "@/components/dashboard/charts/allocation-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TopAssets } from "@/components/dashboard/top-assets";
import { Sun, Coins, Zap, TrendingUp } from "lucide-react";

export function PortfolioSection() {
    return (
        <div className="space-y-6">
            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Portfolio Value"
                    value="$0"
                    change="0%"
                    changeType="neutral"
                    icon={Sun}
                    delay={0}
                    gradient="solar"
                />
                <MetricCard
                    title="Total Yield Earned"
                    value="$0"
                    change="0%"
                    changeType="neutral"
                    icon={Coins}
                    delay={1}
                    gradient="energy"
                />
                <MetricCard
                    title="Active Investments"
                    value="0"
                    change="0"
                    changeType="neutral"
                    icon={Zap}
                    delay={2}
                    gradient="investment"
                />
                <MetricCard
                    title="Claimable Rewards"
                    value="$0"
                    change="--"
                    changeType="neutral"
                    icon={TrendingUp}
                    delay={3}
                    gradient="yield"
                />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <PortfolioChart />
                </div>
                <AllocationChart />
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentTransactions />
                <TopAssets />
            </div>
        </div>
    );
}
