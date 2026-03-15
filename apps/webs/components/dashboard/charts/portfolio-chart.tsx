"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

const rangeMonths: Record<TimeRange, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  ALL: Infinity,
};

export function PortfolioChart({
  data: initialData = [],
  loading,
}: PortfolioChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("6M");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const timeRanges: TimeRange[] = ["1M", "3M", "6M", "1Y", "ALL"];

  const months = rangeMonths[timeRange];
  const data = months === Infinity ? initialData : initialData.slice(-months);

  const currentValue = data[data.length - 1]?.value || 0;
  const startValue = data[0]?.value || 0;
  const change = currentValue - startValue;
  const changePercent =
    startValue > 0 ? ((change / startValue) * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-1">
            Portfolio Value
          </h3>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              ${currentValue.toLocaleString()}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                change >= 0 ? "text-emerald-600" : "text-red-600",
              )}
            >
              {change >= 0 ? "+" : ""}
              {changePercent}%
            </span>
          </div>
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                timeRange === range
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "h-64 transition-opacity duration-500",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      >
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-400">
              No portfolio data available yet.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
            >
              <defs>
                <linearGradient
                  id="portfolioGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f4f4f5"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#a1a1aa" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#a1a1aa" }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e4e4e7",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                labelStyle={{ color: "#18181b" }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Value",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#portfolioGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
