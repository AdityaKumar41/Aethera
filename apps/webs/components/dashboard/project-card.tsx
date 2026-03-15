"use client";

import { cn } from "@/lib/utils";
import { MapPin, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

interface Project {
  id: string;
  name: string;
  location: string;
  capacity: string;
  fundingProgress: number;
  fundingGoal: number;
  currentFunding: number;
  expectedYield: number;
  tokenPrice: number;
  status: "funding" | "funded" | "producing";
  image?: string;
}

interface ProjectCardProps {
  project: Project;
  delay?: number;
  onViewDetails?: (id: string) => void;
  onInvest?: (id: string) => void;
}

const statusConfig: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  funding: {
    label: "Open to Invest",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  funded: {
    label: "Fully Funded",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  producing: {
    label: "Producing",
    dot: "bg-emerald-500 animate-pulse",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  active: {
    label: "Active",
    dot: "bg-emerald-500 animate-pulse",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  completed: {
    label: "Completed",
    dot: "bg-zinc-400",
    badge: "bg-zinc-50 text-zinc-600 border-zinc-200",
  },
  draft: {
    label: "Draft",
    dot: "bg-zinc-300",
    badge: "bg-zinc-50 text-zinc-500 border-zinc-200",
  },
  pending_approval: {
    label: "Under Review",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
  },
  approved: {
    label: "Approved",
    dot: "bg-blue-400",
    badge: "bg-blue-50 text-blue-600 border-blue-200",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-600 border-red-200",
  },
};

export function ProjectCard({
  project,
  delay = 0,
  onViewDetails,
  onInvest,
}: ProjectCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay * 80);
    return () => clearTimeout(t);
  }, [delay]);

  const config = statusConfig[project.status] || statusConfig.active;
  const canInvest = project.status === "funding" && !!onInvest;

  return (
    <div
      className={cn(
        "group bg-white border border-zinc-100 rounded-2xl overflow-hidden transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        "hover:border-zinc-200 hover:shadow-lg hover:shadow-zinc-100/80",
      )}
      style={{ transitionDelay: `${delay * 60}ms` }}
    >
      {/* Image */}
      <div className="relative h-44 bg-zinc-900 overflow-hidden">
        <img
          src={project.image || "/hero-solar.png"}
          alt={project.name}
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Status badge */}
        <div
          className={cn(
            "absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
            config.badge,
          )}
        >
          <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
          {config.label}
        </div>

        {/* Verified badge */}
        <div className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        </div>

        {/* Capacity chip */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 rounded-lg px-2.5 py-1 shadow-sm">
          <Zap className="w-3 h-3 text-amber-500" />
          <span className="text-xs font-semibold text-zinc-800">
            {project.capacity}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Name and location */}
        <div>
          <h3 className="font-semibold text-zinc-900 truncate mb-1 text-base">
            {project.name}
          </h3>
          <div className="flex items-center gap-1 text-zinc-400 text-sm">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
        </div>

        {/* Funding progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-500">Funding Progress</span>
            <span className="font-semibold text-zinc-900">
              {project.fundingProgress.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                project.fundingProgress >= 100
                  ? "bg-emerald-500"
                  : "bg-amber-500",
              )}
              style={{ width: `${Math.min(project.fundingProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-400 mt-1.5">
            <span>${project.currentFunding.toLocaleString()} raised</span>
            <span>of ${project.fundingGoal.toLocaleString()}</span>
          </div>
        </div>

        {/* Yield and price metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-50 rounded-xl p-3">
            <p className="text-xs text-zinc-400 mb-1">Annual Yield</p>
            <p className="text-lg font-bold text-zinc-900">
              {project.expectedYield}%{" "}
              <span className="text-xs font-normal text-zinc-400">APY</span>
            </p>
          </div>
          <div className="bg-zinc-50 rounded-xl p-3">
            <p className="text-xs text-zinc-400 mb-1">Token Price</p>
            <p className="text-lg font-bold text-zinc-900">
              ${project.tokenPrice}{" "}
              <span className="text-xs font-normal text-zinc-400">USDC</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onViewDetails?.(project.id)}
            className="flex-1 h-10 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
          >
            View Details
          </button>
          <button
            disabled={!canInvest}
            onClick={() => canInvest && onInvest!(project.id)}
            className={cn(
              "flex-1 h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all",
              canInvest
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed",
            )}
          >
            {canInvest ? (
              <>
                Invest Now <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : project.status === "funded" ||
              project.status === "producing" ? (
              "Fully Funded"
            ) : (
              "Not Available"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
