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

const yieldData = [
    { month: "Aug", sunnyvale: 0, blueRidge: 0, horizon: 0 },
    { month: "Sep", sunnyvale: 0, blueRidge: 0, horizon: 0 },
    { month: "Oct", sunnyvale: 0, blueRidge: 0, horizon: 0 },
    { month: "Nov", sunnyvale: 0, blueRidge: 0, horizon: 0 },
    { month: "Dec", sunnyvale: 0, blueRidge: 0, horizon: 0 },
    { month: "Jan", sunnyvale: 0, blueRidge: 0, horizon: 0 },
];

export function YieldChart() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Monthly Yield Distribution</h3>
                    <p className="text-lg font-semibold">Yield by Project</p>
                </div>
            </div>

            <div className={cn(
                "h-64 transition-opacity duration-500",
                isVisible ? "opacity-100" : "opacity-0"
            )}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yieldData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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
                            }}
                            formatter={(value: number) => [`$${value}`, ""]}
                        />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                        />
                        <Bar
                            dataKey="sunnyvale"
                            name="Sunnyvale Solar"
                            stackId="a"
                            fill="#f59e0b"
                            radius={[0, 0, 0, 0]}
                        />
                        <Bar
                            dataKey="blueRidge"
                            name="Blue Ridge"
                            stackId="a"
                            fill="#10b981"
                            radius={[0, 0, 0, 0]}
                        />
                        <Bar
                            dataKey="horizon"
                            name="Horizon Rooftop"
                            stackId="a"
                            fill="#8b5cf6"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
