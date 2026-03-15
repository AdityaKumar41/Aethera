"use client";

import { useState, useEffect } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface YieldDataEntry {
    month: string;
    [key: string]: string | number;
}

interface YieldChartProps {
    data?: YieldDataEntry[];
    loading?: boolean;
}

export function YieldChart({ data = [], loading }: YieldChartProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Extract unique project names for bars
    const projectKeys = Array.from(new Set(
        data.flatMap(entry => Object.keys(entry).filter(key => key !== 'month'))
    ));

    const colors = ["#f59e0b", "#10b981", "#8b5cf6", "#3b82f6", "#ec4899"];

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-sm font-medium text-zinc-500 mb-1">Monthly Yield Distribution</h3>
                    <p className="text-lg font-semibold">Yield by Project</p>
                </div>
            </div>

            <div className={cn(
                "h-64 transition-opacity duration-500",
                isVisible ? "opacity-100" : "opacity-0"
            )}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "12px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                            cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, "Yield"]}
                        />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                        />
                        {projectKeys.map((key, index) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                name={key}
                                stackId="a"
                                fill={colors[index % colors.length]}
                                radius={index === projectKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>

            </div>
        </div>
    );
}
