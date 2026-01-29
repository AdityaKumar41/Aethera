"use client";

import { useState, useEffect } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";

interface ChartData {
    month: string;
    value: number;
}

type TimeRange = "1M" | "3M" | "6M" | "1Y" | "ALL";

interface PortfolioChartProps {
    data?: ChartData[];
    loading?: boolean;
}

export function PortfolioChart({ data: initialData = [], loading }: PortfolioChartProps) {
    const [data, setData] = useState<ChartData[]>(initialData);
    const [timeRange, setTimeRange] = useState<TimeRange>("6M");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (initialData.length > 0) {
            setData(initialData);
        }
    }, [initialData]);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 300);
        return () => clearTimeout(timer);
    }, []);

    const timeRanges: TimeRange[] = ["1M", "3M", "6M", "1Y", "ALL"];

    const currentValue = data[data.length - 1]?.value || 0;
    const startValue = data[0]?.value || 0;
    const change = currentValue - startValue;
    const changePercent = ((change / startValue) * 100).toFixed(1);

    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Portfolio Value</h3>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold">${currentValue.toLocaleString()}</span>
                        <span className={cn(
                            "text-sm font-medium",
                            change >= 0 ? "text-success" : "text-destructive"
                        )}>
                            {change >= 0 ? "+" : ""}{changePercent}%
                        </span>
                    </div>
                </div>
                <div className="flex gap-1 bg-secondary rounded-lg p-1">
                    {timeRanges.map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                timeRange === range
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <div className={cn(
                "h-64 transition-opacity duration-500",
                isVisible ? "opacity-100" : "opacity-0"
            )}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "12px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            fill="url(#portfolioGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
