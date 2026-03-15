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
        "group relative bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden transition-all duration-500",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
        "hover:border-zinc-900/10 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:-translate-y-1"
      )}
      style={{ transitionDelay: `${delay * 70}ms` }}
    >
      {/* Visual Header / Image Area */}
      <div className="relative h-56 bg-zinc-950 overflow-hidden">
        <img 
          src={project.image || "/hero-solar.png"} 
          alt={project.name} 
          className="w-full h-full object-cover opacity-70 transition-transform duration-[2s] ease-out group-hover:scale-110" 
        />
        
        {/* Advanced Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.1),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        {/* Status Badge */}
        <div className="absolute top-5 left-5 z-10">
          <div className="px-3.5 py-2 rounded-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 flex items-center gap-2.5 shadow-2xl">
            <div className={cn("w-1.5 h-1.5 rounded-full ring-4 ring-white/5", config.color, "animate-pulse")} />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none">
              {config.label}
            </span>
          </div>
        </div>

        {/* Verification */}
        <div className="absolute top-5 right-5 z-10">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-xl hover:bg-emerald-500 hover:border-emerald-400 transition-all duration-500 group/shield">
            <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover/shield:text-white transition-colors" />
          </div>
        </div>

        {/* Capacity Overlay */}
        <div className="absolute bottom-6 left-6 z-10">
          <div className="px-4 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl flex items-center gap-2 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] border border-zinc-200/50">
            <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            <p className="text-[11px] font-bold text-zinc-950 tracking-tight">
              {project.capacity}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Title and location */}
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-zinc-950 tracking-tighter leading-tight italic lowercase truncate decoration-zinc-200 underline-offset-4 group-hover:underline">
            {project.name}
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest italic leading-none">
            <MapPin className="w-3.5 h-3.5 text-orange-500/70" />
            {project.location}
          </div>
        </div>

        {/* Funding progress */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] italic leading-none">
                Capitalization
              </p>
              <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                Distributed Consensus
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-zinc-950 font-mono italic tracking-tighter">
                 {project.fundingProgress}%
              </p>
            </div>
          </div>
          
          <div className="relative">
            <div className="h-2 bg-zinc-50 rounded-full overflow-hidden p-[2px] border border-zinc-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-[1.5s] ease-out relative",
                  project.fundingProgress >= 100
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.3)]",
                )}
                style={{ width: `${Math.min(project.fundingProgress, 100)}%` }}
              >
                {/* Glossy overlay for progress bar */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em] font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500/20" />
              <span>${project.currentFunding.toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-zinc-200 font-light">/</span>
            <div className="flex items-center gap-1.5">
              <span>${project.fundingGoal.toLocaleString()}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-100" />
            </div>
          </div>
        </div>

        {/* Impact/Yield Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-[2rem] bg-zinc-50 border border-zinc-100/50 group-hover:bg-white group-hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.03)] transition-all duration-500">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 italic leading-none">
              Target Yield
            </p>
            <p className="text-2xl font-black text-zinc-950 italic tracking-tighter">
              {project.expectedYield}%<span className="text-[10px] ml-1 uppercase not-italic font-bold opacity-30 tracking-widest">apy</span>
            </p>
          </div>
          <div className="p-4 rounded-[2rem] bg-zinc-50 border border-zinc-100/50 group-hover:bg-white group-hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.03)] transition-all duration-500">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 italic leading-none">
              Asset Price
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-zinc-950 font-mono tracking-tighter">
                ${project.tokenPrice}
              </p>
              <span className="text-[9px] font-bold text-zinc-300 uppercase">usdc</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => onViewDetails && onViewDetails(project.id)}
            className="h-14 flex items-center justify-center rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] bg-white border border-zinc-200 text-zinc-400 hover:border-zinc-950 hover:text-zinc-950 transition-all active:scale-95 hover:shadow-lg"
          >
            View Asset
          </button>

          <button
            disabled={project.status !== "funding" || !onInvest}
            onClick={() => onInvest && onInvest(project.id)}
            className={cn(
              "h-14 flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all relative overflow-hidden group/btn",
              project.status === "funding" && onInvest
                ? "bg-zinc-950 text-white hover:bg-orange-600 shadow-xl shadow-zinc-900/10 active:scale-95"
                : "bg-zinc-100 text-zinc-300 cursor-not-allowed border border-zinc-200",
            )}
          >
            {project.status === "funding" ? (
              <>
                <span className="relative z-10">Commit Capital</span>
                <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover/btn:translate-x-1" />
              </>
            ) : project.status === "funded" ? (
              "Sold Out"
            ) : (
              "Finalized"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
