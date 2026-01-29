"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  gradient?: "solar" | "energy" | "investment" | "yield";
}

const gradientClasses = {
  solar: "from-amber-400 to-orange-500",
  energy: "from-emerald-400 to-teal-500",
  investment: "from-blue-400 to-indigo-500",
  yield: "from-violet-400 to-purple-500",
};

export function MetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  delay = 0,
  gradient,
}: MetricCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay * 100);
    return () => clearTimeout(timer);
  }, [delay]);

  // Animate number counting
  useEffect(() => {
    if (!isVisible) return;

    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""));
    const prefix = value.match(/^[^0-9]*/)?.[0] || "";
    const suffix = value.match(/[^0-9]*$/)?.[0] || "";

    if (isNaN(numericValue)) {
      setDisplayValue(value);
      return;
    }

    let startTime: number;
    const duration = 1000;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = numericValue * easeOutQuart;

      // Format the value appropriately
      if (numericValue >= 1000000) {
        setDisplayValue(`${prefix}${(currentValue / 1000000).toFixed(1)}M${suffix}`);
      } else if (numericValue >= 1000) {
        setDisplayValue(`${prefix}${(currentValue / 1000).toFixed(1)}k${suffix}`);
      } else if (numericValue % 1 !== 0) {
        setDisplayValue(`${prefix}${currentValue.toFixed(1)}${suffix}`);
      } else {
        setDisplayValue(`${prefix}${Math.floor(currentValue)}${suffix}`);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value]);

  return (
    <div
      className={cn(
        "group relative bg-card border border-border rounded-2xl p-5 hover:border-accent/50 transition-all duration-300 overflow-hidden",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{ transitionDelay: `${delay * 100}ms` }}
    >
      {/* Gradient background accent */}
      {gradient && (
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500",
          `bg-gradient-to-br ${gradientClasses[gradient]}`
        )} />
      )}

      {/* Subtle gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm text-muted-foreground font-medium">
            {title}
          </span>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
            gradient
              ? `bg-gradient-to-br ${gradientClasses[gradient]} shadow-lg`
              : "bg-secondary group-hover:bg-accent/10"
          )}>
            <Icon className={cn(
              "w-5 h-5 transition-colors duration-300",
              gradient ? "text-white" : "text-muted-foreground group-hover:text-accent"
            )} />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <span className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            {displayValue}
          </span>
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium mb-1.5",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}
          >
            {changeType === "positive" && <TrendingUp className="w-4 h-4" />}
            {changeType === "negative" && (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{change}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
