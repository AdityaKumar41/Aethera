"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AllocationItem {
    name: string;
    value: number;
    color: string;
}

interface AllocationChartProps {
    data?: AllocationItem[];
    loading?: boolean;
}

export function AllocationChart({ data: allocationData = [], loading }: AllocationChartProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 400);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="bg-card border border-border rounded-2xl p-5 h-full min-h-[300px] flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-secondary border-t-accent animate-spin" />
            </div>
        );
    }

    const total = allocationData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Portfolio Allocation</h3>

            <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            {allocationData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                                    style={{
                                        transform: activeIndex === index ? "scale(1.05)" : "scale(1)",
                                        transformOrigin: "center",
                                        transition: "all 0.2s ease-out",
                                    }}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "12px",
                            }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-2">
                {allocationData.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className={activeIndex === index ? "font-medium" : "text-muted-foreground"}>
                                {item.name}
                            </span>
                        </div>
                        <span className="font-medium">
                            {((item.value / total) * 100).toFixed(0)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
