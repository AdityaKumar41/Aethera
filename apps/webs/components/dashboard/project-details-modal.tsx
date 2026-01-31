"use client";

import {
  X,
  MapPin,
  Zap,
  TrendingUp,
  Sun,
  ShieldCheck,
  ArrowRight,
  Coins,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/api";

interface ProjectDetailsModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onInvest?: (projectId: string) => void;
}

export function ProjectDetailsModal({
  project,
  isOpen,
  onClose,
  onInvest,
}: ProjectDetailsModalProps) {
  if (!isOpen || !project) return null;

  const fundingPercentage = project.fundingPercentage || 0;
  const isFunded = fundingPercentage >= 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Header Ribbon */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-[9px] font-black text-orange-600 uppercase tracking-widest">
                Solar Investment
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" />
                Verified Project
              </span>
              {!isFunded && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                  Accepting Investments
                </span>
              )}
            </div>

            <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-none mb-2">
              {project.name}
            </h1>

            <div className="flex items-center gap-3 text-zinc-500 text-sm">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-bold">{project.location}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-300" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-bold">{project.capacity} kW</span>
              </div>
            </div>
          </div>

          {/* Main Content - Compact Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Side - Project Info */}
            <div className="col-span-7 space-y-5">
              {/* Description */}
              {project.description && (
                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Sun className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                      Project Description
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {project.description}
                  </p>
                </div>
              )}

              {/* Technical Specs */}
              <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                    Technical Specifications
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Capacity
                    </p>
                    <p className="text-base font-black text-zinc-900">
                      {project.capacity} kW
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Location
                    </p>
                    <p className="text-base font-black text-zinc-900">
                      {project.location}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Status
                    </p>
                    <p className="text-base font-black text-emerald-600 capitalize">
                      {project.status}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Token
                    </p>
                    <p className="text-base font-black text-orange-600">
                      {project.tokenSymbol}
                    </p>
                  </div>
                </div>
              </div>

              {/* Funding Progress */}
              <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-orange-500" />
                  <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                    Funding Progress
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Target
                    </p>
                    <p className="text-lg font-black text-zinc-900">
                      ${Number(project.fundingTarget || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Raised
                    </p>
                    <p className="text-lg font-black text-emerald-600">
                      ${Number(project.fundingRaised || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      Remaining
                    </p>
                    <p className="text-lg font-black text-orange-600">
                      $
                      {(
                        Number(project.fundingTarget || 0) -
                        Number(project.fundingRaised || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-500">
                      Progress
                    </span>
                    <span className="text-base font-black text-zinc-900">
                      {fundingPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        isFunded ? "bg-emerald-500" : "bg-orange-500",
                      )}
                      style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Investment Highlights */}
            <div className="col-span-5 space-y-5">
              {/* Investment Stats */}
              <div className="bg-gradient-to-br from-orange-50 to-emerald-50 rounded-2xl p-5 border border-orange-100 space-y-3">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-3">
                  Investment Highlights
                </h3>

                <div className="p-4 bg-white rounded-xl border border-zinc-100">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      Expected APY
                    </p>
                  </div>
                  <p className="text-3xl font-black text-emerald-600">
                    {project.expectedYield}%
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-zinc-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-orange-500" />
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      Price per Token
                    </p>
                  </div>
                  <p className="text-3xl font-black text-zinc-900">
                    ${project.pricePerToken}
                  </p>
                  <p className="text-xs font-bold text-zinc-400 mt-1">USDC</p>
                </div>
              </div>

              {/* Key Info */}
              <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100 space-y-2.5">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-3">
                  Key Information
                </h3>

                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      Verification
                    </p>
                    <p className="text-xs font-bold text-zinc-900">
                      KYC Required
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-100">
                  <Coins className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      Settlement
                    </p>
                    <p className="text-xs font-bold text-zinc-900">
                      Instant On-Chain
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-100">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      Distribution
                    </p>
                    <p className="text-xs font-bold text-zinc-900">
                      Monthly Yields
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              {!isFunded && onInvest && (
                <button
                  onClick={() => onInvest(project.id)}
                  className="w-full h-14 rounded-xl bg-zinc-900 text-white font-black uppercase tracking-[0.15em] text-xs hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2"
                >
                  Invest Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {isFunded && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <p className="text-xs font-black text-emerald-900 uppercase tracking-widest">
                    Fully Funded
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-1">
                    This project has reached its funding goal
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
