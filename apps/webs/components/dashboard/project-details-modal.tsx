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
import { ViewportPortal } from "@/components/ui/viewport-portal";

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
  const tokenSymbol = project.tokenSymbol?.trim() || "Pending";
  const tokenContractId = project.tokenContractId?.trim();
  const tokenDeployed = Boolean(tokenContractId);
  const canInvest =
    Boolean(onInvest) &&
    project.status === "FUNDING" &&
    tokenDeployed &&
    !isFunded;
  const statusTone = tokenDeployed
    ? "text-emerald-400"
    : project.status === "PENDING_APPROVAL"
      ? "text-amber-400"
      : "text-blue-400";
  const statusLabel = tokenDeployed
    ? "On-Chain Live"
    : project.status === "PENDING_APPROVAL"
      ? "Review Pending"
      : "Deploy Pending";
  const tokenMetaLabel = tokenDeployed ? "Live contract" : "Reserved ticker";
  const networkLabel = tokenDeployed
    ? "Stellar contract live"
    : "Awaiting admin token deployment";
  const tokenExplorerUrl = tokenContractId
    ? `https://stellar.expert/explorer/testnet/contract/${tokenContractId}`
    : null;

  return (
    <ViewportPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-500"
          onClick={onClose}
        />

        <div className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-400 border border-zinc-200">
          {/* Close Button - Premium Glass */}
          <button
            onClick={onClose}
            className="absolute top-8 right-8 p-3.5 rounded-2xl bg-white/10 backdrop-blur-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-950 transition-all z-30 active:scale-90 border border-transparent hover:border-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
          {/* Left Column: Media & Core Identity */}
          <div className="bg-zinc-950 p-10 lg:p-16 text-white space-y-10 relative overflow-hidden flex flex-col justify-center">
            {/* Advanced Visual Effects */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.2),transparent_70%)]" />
              <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.1),transparent_70%)]" />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] italic">
                   Verified Physical Asset
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-widest",
                      statusTone,
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.85] italic lowercase underline decoration-white/5 underline-offset-[12px]">
                  {project.name}.
                </h1>
                
                <div className="flex flex-wrap items-center gap-6 text-zinc-400 font-bold text-[11px] uppercase tracking-[0.2em]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500/80" />
                    {project.location}, {project.country}
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500/80" />
                    {project.capacity} kW Grid
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic">
                   Asset Proposition
                </p>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-medium opacity-90">
                  {project.description || "High-performance solar utility asset with institutional-grade certification. This project facilitates direct energy distribution to regional networks with guaranteed off-take agreements and a projected 25-year operational lifespan."}
                </p>
              </div>

              {/* Advanced Specs Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-colors">
                   <p className="text-[9px] font-black text-white/20 uppercase mb-2 tracking-widest">Asset Token</p>
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                        <Coins className="w-3 h-3 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-white tracking-tight">
                          {tokenSymbol}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                          {tokenMetaLabel}
                        </p>
                      </div>
                   </div>
                </div>
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-colors">
                   <p className="text-[9px] font-black text-white/20 uppercase mb-2 tracking-widest">Target Alpha</p>
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                      </div>
                      <p className="text-base font-bold text-emerald-400 font-mono tracking-tight">{project.expectedYield}% <span className="text-[10px] opacity-40 uppercase font-bold">apy</span></p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Economics & Execution */}
          <div className="p-10 lg:p-16 bg-white flex flex-col justify-between">
            <div className="space-y-12">
              {/* Financial Architecture */}
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-6">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-zinc-950 uppercase tracking-[0.2em]">
                      Allocation Ledger
                    </h3>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      {networkLabel}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-2">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        tokenDeployed ? "bg-emerald-500" : "bg-orange-600",
                      )}
                    />
                    <span className="text-[10px] font-black text-zinc-950 uppercase">
                      {tokenDeployed ? "Token Ready" : "Off-Chain Draft"}
                    </span>
                  </div>
                </div>

                <div className="space-y-8">
                  {!tokenDeployed && (
                    <div className="rounded-[2rem] border border-amber-100 bg-amber-50 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-1">
                        Launch Sequence
                      </p>
                      <p className="text-sm text-amber-900 leading-relaxed">
                        This project has a reserved ticker, but the real Stellar
                        contract is not live yet. Investing opens only after
                        admin approval completes token deployment.
                      </p>
                    </div>
                  )}

                  {tokenDeployed && tokenExplorerUrl && (
                    <a
                      href={tokenExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[2rem] border border-emerald-100 bg-emerald-50 px-5 py-4 text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                          Stellar Expert
                        </p>
                        <p className="text-xs font-mono break-all opacity-80">
                          {tokenContractId}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </a>
                  )}

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Total Supply</p>
                      <p className="text-4xl font-black text-zinc-950 font-mono tracking-tighter italic">
                        ${(Number(project.fundingTarget) || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Remaining Cap</p>
                      <p className="text-4xl font-black text-orange-600 font-mono tracking-tighter italic">
                        ${(Number(project.fundingTarget) - Number(project.fundingRaised || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="relative pt-2">
                    <div className="h-4 bg-zinc-50 rounded-full overflow-hidden p-[4px] border border-zinc-100">
                      <div 
                        className="h-full bg-zinc-950 rounded-full transition-all duration-[2s] ease-out shadow-[0_0_20px_rgba(0,0,0,0.1)] relative overflow-hidden"
                        style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
                      >
                         <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Economic Units */}
              <div className="grid grid-cols-1 gap-4">
                <div className="group flex items-center justify-between p-6 rounded-[2.5rem] bg-zinc-50 border border-zinc-100/50 hover:bg-white hover:shadow-xl hover:shadow-zinc-200/40 transition-all duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Entry Price</p>
                       <p className="text-sm font-bold text-zinc-950 uppercase">Per Dividend Unit</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-zinc-950 font-mono tracking-tight">${project.pricePerToken} <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">usdc</span></p>
                </div>

                <div className="group flex items-center justify-between p-6 rounded-[2.5rem] bg-zinc-50 border border-zinc-100/50 hover:bg-white hover:shadow-xl hover:shadow-zinc-200/40 transition-all duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-400 transition-colors">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Certification</p>
                       <p className="text-sm font-bold text-zinc-950 uppercase">Securities Status</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">Reg-D Compliant</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Atomic Execution Area */}
            <div className="pt-12 space-y-6">
              {canInvest && (
                <button
                  onClick={() => onInvest?.(project.id)}
                  className="group/btn relative w-full h-20 rounded-[2rem] bg-zinc-950 text-white font-black uppercase tracking-[0.2em] text-[12px] hover:bg-orange-600 transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-4 overflow-hidden"
                >
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-500" />
                  <span className="relative z-10">Commit Strategic Investment</span>
                  <ArrowRight className="w-5 h-5 relative z-10 transition-transform group-hover/btn:translate-x-1.5" />
                </button>
              )}

              {isFunded && (
                <div className="p-8 bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] text-center space-y-2 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16" />
                  <p className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.3em] italic">Market fully subscribed</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">Secondary exchange migration pending</p>
                  </div>
                </div>
              )}

              {!isFunded && !canInvest && (
                <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-[2rem] text-center space-y-2">
                  <p className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                    Investment Not Open Yet
                  </p>
                  <p className="text-sm text-zinc-500">
                    Funding opens after the project reaches live token
                    deployment on Stellar testnet.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
                 <ShieldCheck className="w-3.5 h-3.5" />
                 <p className="text-[9px] text-zinc-950 uppercase font-black tracking-[0.3em]">
                   Encrypted via Stellar Distributed Ledger
                 </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </ViewportPortal>
  );
}
