"use client";

import { cn } from "@/lib/utils";
import {
  MapPin,
  Zap,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Sun,
} from "lucide-react";
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

const statusConfig = {
  funding: {
    label: "Funding Now",
    color: "bg-orange-500",
    text: "text-orange-600",
  },
  funded: {
    label: "Project Funded",
    color: "bg-emerald-500",
    text: "text-emerald-600",
  },
  producing: {
    label: "Operational",
    color: "bg-blue-500",
    text: "text-blue-600",
  },
  active: { label: "Active", color: "bg-orange-500", text: "text-orange-600" },
  completed: {
    label: "Completed",
    color: "bg-zinc-500",
    text: "text-zinc-600",
  },
  draft: { label: "Draft", color: "bg-zinc-400", text: "text-zinc-400" },
  pending_approval: {
    label: "Reviewing",
    color: "bg-orange-400",
    text: "text-orange-500",
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-400",
    text: "text-emerald-500",
  },
  rejected: { label: "Rejected", color: "bg-red-500", text: "text-red-600" },
};

export function ProjectCard({
  project,
  delay = 0,
  onViewDetails,
  onInvest,
}: ProjectCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 100);
    return () => clearTimeout(timer);
  }, [delay]);

  const config =
    statusConfig[project.status as keyof typeof statusConfig] ||
    statusConfig.active;

  return (
    <div
      className={cn(
        "group relative bg-white border border-zinc-200 rounded-4xl overflow-hidden transition-all duration-500",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        "hover:border-orange-500/20 hover:shadow-[0_20px_40px_-12px_rgba(249,115,22,0.1)]",
      )}
      style={{ transitionDelay: `${delay * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visual Header / Image Area */}
      <div className="relative h-40 bg-zinc-50 overflow-hidden m-3 rounded-3xl">
        <div className="absolute inset-0 bg-linear-to-tr from-orange-500/5 via-transparent to-emerald-500/5" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <div
            className={cn("w-2 h-2 rounded-full animate-pulse", config.color)}
          />
          <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest px-3 py-1 bg-white/80 backdrop-blur-md border border-zinc-100 rounded-full shadow-sm">
            {config.label}
          </span>
        </div>

        {/* Capacity Badge */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-white shadow-sm border border-zinc-100 rounded-xl">
          <Zap className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-bold text-zinc-900">
            {project.capacity}
          </span>
        </div>

        {/* Verification Badge */}
        <div className="absolute top-3 right-3 z-10">
          <div className="p-1.5 bg-emerald-50 backdrop-blur-md border border-emerald-100 rounded-lg text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Abstract Visual Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <Sun className="w-32 h-32 text-orange-200" />
        </div>
      </div>

      <div className="p-5 pt-1 space-y-5">
        {/* Title and location */}
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight mb-0.5 group-hover:text-orange-600 transition-colors">
            {project.name}
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <MapPin className="w-3.5 h-3.5" />
            {project.location}
          </div>
        </div>

        {/* Funding progress */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Funding Progress
            </p>
            <p className="text-sm font-black text-zinc-900">
              {project.fundingProgress}%
            </p>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                project.fundingProgress >= 100
                  ? "bg-emerald-500"
                  : "bg-orange-500",
              )}
              style={{ width: `${Math.min(project.fundingProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
            <span>${project.currentFunding.toLocaleString()}</span>
            <span>Target: ${project.fundingGoal.toLocaleString()}</span>
          </div>
        </div>

        {/* High Impact Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                Est. APY
              </span>
            </div>
            <p className="text-md font-black text-zinc-900">
              {project.expectedYield}%
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3 h-3 text-orange-500" />
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                Price
              </span>
            </div>
            <p className="text-md font-black text-zinc-900">
              ${project.tokenPrice}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onViewDetails && onViewDetails(project.id)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-widest transition-all text-[10px] bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 active:scale-95"
          >
            View Details
          </button>

          <button
            disabled={project.status !== "funding" || !onInvest}
            onClick={() => onInvest && onInvest(project.id)}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-widest transition-all text-[10px]",
              project.status === "funding" && onInvest
                ? "bg-zinc-900 text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95"
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200",
            )}
          >
            {project.status === "funding" ? (
              <>
                Invest
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : project.status === "funded" ? (
              "Funded"
            ) : (
              "Closed"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
