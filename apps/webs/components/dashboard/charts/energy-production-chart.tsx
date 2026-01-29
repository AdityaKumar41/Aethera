"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

const defaultHourlyData = [
    { hour: "6am", generation: 0 },
    { hour: "8am", generation: 0 },
    { hour: "10am", generation: 0 },
    { hour: "12pm", generation: 0 },
    { hour: "2pm", generation: 0 },
    { hour: "4pm", generation: 0 },
    { hour: "6pm", generation: 0 },
    { hour: "8pm", generation: 0 },
];

type TimeRange = "today" | "week" | "month";

interface EnergyProductionChartProps {
    projectName: string;
}

export function EnergyProductionChart({ projectName }: EnergyProductionChartProps) {
    const [data, setData] = useState(defaultHourlyData);
    const [timeRange, setTimeRange] = useState<TimeRange>("today");
    const [highlightedBar, setHighlightedBar] = useState(4);
    const [totalEnergy, setTotalEnergy] = useState(0);

    // Animate data
    useEffect(() => {
        const interval = setInterval(() => {
            setData((prev) =>
                prev.map((item) => ({
                    ...item,
                    generation: Math.max(50, item.generation + Math.floor(Math.random() * 40) - 20),
                }))
            );
            setTotalEnergy((prev) => prev + Math.floor(Math.random() * 5));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Animate highlight
    useEffect(() => {
        const interval = setInterval(() => {
            setHighlightedBar((prev) => (prev + 1) % data.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [data.length]);

    const maxGeneration = Math.max(...data.map((d) => d.generation));

    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-muted-foreground">Energy Production</h3>
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-xs text-muted-foreground">Live</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{totalEnergy.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">kWh</span>
                    </div>
                </div>
                <div className="flex gap-1 bg-secondary rounded-lg p-1">
                    {(["today", "week", "month"] as TimeRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors",
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

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <XAxis
                            dataKey="hour"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "12px",
                            }}
                            formatter={(value: number) => [`${value} kWh`, "Generation"]}
                        />
                        <Bar dataKey="generation" radius={[6, 6, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        index === highlightedBar
                                            ? "hsl(var(--accent))"
                                            : entry.generation === maxGeneration
                                                ? "hsl(var(--chart-2))"
                                                : "hsl(var(--secondary))"
                                    }
                                    style={{
                                        transition: "fill 0.3s ease",
                                    }}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Peak Output</p>
                    <p className="font-semibold">{maxGeneration} kWh</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                    <p className="font-semibold text-muted-foreground">0%</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">CO₂ Offset</p>
                    <p className="font-semibold">0 tons</p>
                </div>
            </div>
        </div>
    );
}
