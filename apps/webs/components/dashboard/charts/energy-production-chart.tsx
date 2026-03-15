"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Zap } from "lucide-react";

interface EnergyProductionChartProps {
  data?: { date: string; energy: number }[];
  expectedCapacity?: number;
}

/** Standard grid emission factor: 0.435 kg CO2 per kWh */
const CO2_KG_PER_KWH = 0.435;

export function EnergyProductionChart({
  data,
  expectedCapacity,
}: EnergyProductionChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d) => ({
      date: d.date,
      energy: d.energy,
    }));
  }, [data]);

  const totalEnergy = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.energy, 0);
  }, [chartData]);

  const peakOutput = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map((d) => d.energy));
  }, [chartData]);

  const efficiency = useMemo(() => {
    if (!expectedCapacity || expectedCapacity <= 0 || chartData.length === 0)
      return null;
    const expectedTotal = expectedCapacity * chartData.length;
    return Math.min((totalEnergy / expectedTotal) * 100, 100);
  }, [totalEnergy, expectedCapacity, chartData.length]);

  const co2OffsetKg = useMemo(() => {
    return totalEnergy * CO2_KG_PER_KWH;
  }, [totalEnergy]);

  /** Format CO2 as tons when >= 1000 kg, otherwise kg */
  const formattedCo2 = useMemo(() => {
    if (co2OffsetKg >= 1000) {
      return `${(co2OffsetKg / 1000).toFixed(2)} tons`;
    }
    return `${co2OffsetKg.toFixed(1)} kg`;
  }, [co2OffsetKg]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-medium text-zinc-500">
            Energy Production
          </h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <Zap className="w-8 h-8 opacity-40" />
            <p className="text-sm">No production data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-zinc-500">
              Energy Production
            </h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {totalEnergy.toLocaleString()}
            </span>
            <span className="text-sm text-zinc-500">kWh</span>
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          >
            <XAxis
              dataKey="date"
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
              formatter={(value: number) => [`${value} kWh`, "Energy"]}
            />
            <Bar dataKey="energy" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.energy === peakOutput
                      ? "hsl(var(--chart-2))"
                      : "hsl(var(--secondary))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-200">
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-1">Peak Output</p>
          <p className="font-semibold">{peakOutput} kWh</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-1">Efficiency</p>
          <p className="font-semibold">
            {efficiency !== null ? `${efficiency.toFixed(1)}%` : "N/A"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-1">CO2 Offset</p>
          <p className="font-semibold">{formattedCo2}</p>
        </div>
      </div>
    </div>
  );
}
