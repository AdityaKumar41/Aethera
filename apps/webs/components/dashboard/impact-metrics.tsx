"use client";

import { Leaf, Droplets, Wind, Zap } from "lucide-react";

interface ImpactMetricProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  color: string;
}

function ImpactMetric({ label, value, unit, icon: Icon, color }: ImpactMetricProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-border shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold">{value}</span>
          <span className="text-xs text-muted-foreground font-medium">{unit}</span>
        </div>
      </div>
    </div>
  );
}

interface ImpactMetricData {
  carbonOffset: number;
  treesPlanted: number;
  waterSaved: number;
  cleanEnergy: number;
}

interface ImpactMetricsProps {
  data?: ImpactMetricData;
  loading?: boolean;
}

export function ImpactMetrics({ data, loading }: ImpactMetricsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold animate-pulse bg-secondary h-6 w-48 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const values = data || {
    carbonOffset: 0,
    treesPlanted: 0,
    waterSaved: 0,
    cleanEnergy: 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Environmental Impact</h3>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
          Lifetime Data
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <ImpactMetric
          label="Carbon Offset"
          value={values.carbonOffset.toFixed(1)}
          unit="Tons CO2"
          icon={Wind}
          color="bg-blue-500"
        />
        <ImpactMetric
          label="Trees Planted"
          value={Math.round(values.treesPlanted).toLocaleString()}
          unit="Trees"
          icon={Leaf}
          color="bg-emerald-500"
        />
        <ImpactMetric
          label="Water Saved"
          value={values.waterSaved.toFixed(1)}
          unit="k Liters"
          icon={Droplets}
          color="bg-cyan-500"
        />
        <ImpactMetric
          label="Clean Energy"
          value={Math.round(values.cleanEnergy).toLocaleString()}
          unit="kWh"
          icon={Zap}
          color="bg-orange-500"
        />
      </div>
    </div>
  );
}

