"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wallet,
  Coins,
  ArrowUpRight,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWalletBalances,
  useKyc,
  useInvestmentSettlement,
} from "@/hooks/use-dashboard-data";
import { toast } from "sonner";
import type { Project } from "@/lib/api";

interface InvestModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "input" | "confirm" | "processing" | "success" | "error";

export function InvestModal({
  project,
  isOpen,
  onClose,
  onSuccess,
}: InvestModalProps) {
  const [amount, setAmount] = useState(10); // Start with 10 tokens to meet likely min requirements
  const [step, setStep] = useState<Step>("input");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    balances,
    loading: balancesLoading,
    refetch: refetchBalances,
  } = useWalletBalances();
  const claimableBalances = balances?.claimableBalances;
  const { status: kycStatus } = useKyc();
  const { settle, loading: settling } = useInvestmentSettlement();

  // Reset state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setAmount(1);
      setTxHash(null);
      setErrorMessage(null);
      refetchBalances();
      // Lock body scroll
      document.body.style.overflow = "hidden";
    } else {
      // Restore body scroll
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, refetchBalances]);

  // USDC balance detection fix
  // We need to look for an asset that is either native "USDC" or our mock USDC asset
  const usdcBalance = useMemo(() => {
    if (!balances || !balances.balances) return 0;

    // Look for USDC-like assets
    const usdcAsset = balances.balances.find((b) => {
      const code = b.asset || "XLM";
      return code.toUpperCase() === "USDC";
    });

    // If not found by code, we might need a fallback
    // For now, if we don't find USDC, we'll try to find any non-XLM asset as a proxy for testing
    if (!usdcAsset) {
      const fallback = balances.balances.find((b) => b.asset !== "XLM");
      return fallback ? Number(fallback.balance) : 0;
    }

    return Number(usdcAsset.balance);
  }, [balances]);

  // Check if USDC is pending in claimable balances
  const pendingUsdc = useMemo(() => {
    if (!claimableBalances) return 0;
    return claimableBalances
      .filter((b: any) => b.asset.split(":")[0].toUpperCase() === "USDC")
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
  }, [claimableBalances]);

  const totalInvestment = amount * (Number(project?.pricePerToken) || 100);
  const hasEnoughBalance = usdcBalance >= totalInvestment;

  // KYC is required for all investments - check for VERIFIED status
  const canInvest = kycStatus?.status === "VERIFIED";

  const handleInvest = async () => {
    if (!project) return;
    setStep("processing");

    setErrorMessage(null);
    try {
      // The API expects the USDC amount, not the token count
      // And it will calculate the token count backend side
      const result = await settle(project.id, totalInvestment);
      if (result.success) {
        setTxHash(result.txHash);
        setStep("success");
        onSuccess?.();
      } else {
        setErrorMessage(
          result.error || "The on-chain transaction could not be completed.",
        );
        setStep("error");
      }
    } catch (err: any) {
      console.error("Investment error:", err);
      setErrorMessage(
        err.message || "An unexpected error occurred during settlement.",
      );
      setStep("error");
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-400 border border-zinc-200 flex flex-col max-h-[90vh]">
        {/* Header Ribbon */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-zinc-950" />

        <button
          onClick={onClose}
          className="absolute top-8 right-8 p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-950 transition-all z-20 active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10 lg:p-14 overflow-y-auto flex-1">
          {step === "input" && (
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-600 uppercase tracking-widest italic leading-none">
                    Investment Ledger Initiation
                  </div>
                </div>
                <h2 className="text-4xl font-black text-zinc-950 tracking-tighter leading-[0.9] italic lowercase underline decoration-zinc-100 underline-offset-8">
                  Acquire Stake in {project.name}.
                </h2>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] italic">
                  Infrastructure Allocation Strategy • {project.location}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-zinc-950 uppercase tracking-[0.2em]">
                    Unit Allocation
                  </p>
                  <div className="flex items-center gap-6 bg-zinc-50 p-4 border border-zinc-100 rounded-[2.5rem]">
                    <button
                      onClick={() => setAmount(Math.max(1, amount - 1))}
                      className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border border-zinc-200 text-zinc-950 hover:border-zinc-950 hover:shadow-xl transition-all active:scale-90"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center font-black text-3xl text-zinc-950 font-mono italic">
                      {amount}
                    </div>
                    <button
                      onClick={() => setAmount(amount + 1)}
                      className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border border-zinc-200 text-zinc-950 hover:border-zinc-950 hover:shadow-xl transition-all active:scale-90"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {[1, 5, 10, 50].map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val)}
                        className={cn(
                          "h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                          amount === val
                            ? "bg-zinc-950 border-zinc-950 text-white shadow-lg"
                            : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:text-zinc-600",
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div
                    className={cn(
                      "p-8 rounded-4xl bg-zinc-950 text-white space-y-2 relative overflow-hidden group",
                    )}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/20 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-orange-600/30 transition-all duration-1000" />
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] relative z-10 italic">
                      Capital Commitment
                    </p>
                    <div className="flex items-baseline gap-2 relative z-10">
                      <span className="text-5xl font-black font-mono tracking-tighter">
                        ${totalInvestment.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">
                        USDC
                      </span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-6 rounded-4xl border-2 space-y-4 transition-all duration-500",
                      hasEnoughBalance
                        ? "bg-zinc-50 border-zinc-100"
                        : "bg-red-50 border-red-100",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Wallet className={cn("w-4 h-4", hasEnoughBalance ? "text-emerald-500" : "text-red-500")} />
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                          Wallet liquidity
                        </span>
                      </div>
                    </div>
                    <p className={cn("text-2xl font-black font-mono tracking-tight", hasEnoughBalance ? "text-zinc-950" : "text-red-700")}>
                      {balancesLoading ? "analysing..." : `${usdcBalance.toLocaleString()} USDC`}
                    </p>
                  </div>
                </div>
              </div>

              {!hasEnoughBalance && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-red-950 uppercase tracking-widest italic">Insufficient Capitalization</p>
                    <p className="text-[10px] text-red-700 font-medium leading-relaxed">
                      Your current USDC liquidity is below the required threshold for this allocation. 
                      Please fund your on-chain wallet to proceed with the investment.
                    </p>
                  </div>
                </div>
              )}

              {!canInvest && (
                <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-start gap-4">
                  <ShieldCheck className="w-5 h-5 text-zinc-400 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-zinc-950 uppercase tracking-widest italic">Compliance Lock</p>
                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                      KYC verification is required to participate in this private primary market distribution. 
                      Please update your identity status in account settings.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-100">
                <button
                  disabled={!hasEnoughBalance || !canInvest || totalInvestment < 100}
                  onClick={() => setStep("confirm")}
                  className={cn(
                    "w-full h-18 rounded-2xl flex items-center justify-center gap-4 font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-2xl active:scale-95 group",
                    hasEnoughBalance && canInvest && totalInvestment >= 100
                      ? "bg-zinc-950 text-white hover:bg-orange-600"
                      : "bg-zinc-100 text-zinc-300 border border-zinc-200 cursor-not-allowed",
                  )}
                >
                  Confirm Allocation Strategy
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
                <p className="text-[8px] text-center text-zinc-400 uppercase font-black tracking-[0.2em] mt-6 italic">
                   Investment subject to jurisdictional regulatory frameworks • Secured by Stellar Network
                </p>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-12 py-10 animate-in slide-in-from-right-12 fade-in duration-600">
              <div className="text-left space-y-4">
                <h3 className="text-4xl font-black text-zinc-950 italic tracking-tighter lowercase underline decoration-zinc-100 underline-offset-8">
                  Commitment Summary.
                </h3>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  Final verification of investment parameters
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {[
                  { label: "Asset Substrate", val: project.name, accent: "text-zinc-950" },
                  { label: "Token Allocation", val: `${amount} units`, accent: "text-zinc-950" },
                  { label: "Execution Price", val: `$${project.pricePerToken} usdc/unit`, accent: "text-zinc-950 font-mono" },
                  { label: "Target Alpha", val: `${project.expectedYield}% APY`, accent: "text-emerald-500 italic" }
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center border-b border-zinc-50 pb-4">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.label}</p>
                    <p className={cn("text-lg font-black italic", item.accent)}>{item.val}</p>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-6">
                  <p className="text-[10px] font-black text-zinc-950 uppercase tracking-[0.3em]">Total Consideration</p>
                  <p className="text-4xl font-black text-orange-600 font-mono tracking-tighter italic">
                    ${totalInvestment.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-10">
                <button
                  onClick={handleInvest}
                  disabled={settling}
                  className="w-full h-20 rounded-2xl bg-zinc-950 text-white font-black uppercase tracking-[0.2em] text-[11px] hover:bg-orange-600 transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-4 group"
                >
                  {settling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Execute Final Settlement
                      <ShieldCheck className="w-5 h-5" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStep("input")}
                  className="w-full py-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:text-zinc-950 transition-colors italic"
                >
                  ← Respecify Investment parameters
                </button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-24 flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-700">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-2 border-zinc-50 border-t-zinc-950 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                    <Sun className="w-8 h-8 text-orange-500 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-3xl font-black text-zinc-950 uppercase tracking-tighter italic underline decoration-zinc-100 underline-offset-8">
                  Settling on-chain.
                </h3>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                  Consensus integration in progress. Your cryptographic allocation request is being relayed to the Stellar decentralized ledger.
                </p>
              </div>
              <div className="flex items-center gap-4 p-5 bg-zinc-50 border border-zinc-100 rounded-3xl w-full max-w-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse [animation-delay:200ms]" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/20 animate-pulse [animation-delay:400ms]" />
                </div>
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">
                  Distributed Consensus Synchronizing
                </span>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-16 space-y-12 animate-in zoom-in-95 fade-in duration-800">
              <div className="flex justify-center">
                <div className="relative scale-110">
                  <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-3xl shadow-emerald-500/30">
                    <CheckCircle2 className="w-16 h-16 text-white" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-zinc-100 shadow-xl">
                    <ShieldCheck className="w-7 h-7 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <h3 className="text-4xl font-black text-zinc-950 tracking-tighter italic underline decoration-zinc-100 underline-offset-8">
                  Capital Finalized.
                </h3>
                <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] max-w-md mx-auto leading-loose italic">
                  Success confirmed. Allocation of {amount} units for <strong>{project.name}</strong> has been secured on-chain.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">
                    Cryptographic Proof
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[9px] font-black text-orange-600 hover:text-orange-700 underline underline-offset-4 uppercase tracking-widest"
                  >
                    View Network Explorer
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
                <div className="w-full p-4 bg-white border border-zinc-200 rounded-2xl font-mono text-[10px] text-zinc-400 break-all select-all">
                  {txHash}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full h-20 rounded-2xl bg-zinc-950 text-white font-black uppercase tracking-[0.2em] text-[11px] hover:bg-emerald-600 transition-all active:scale-95 shadow-3xl shadow-emerald-500/10"
              >
                Integrate into Terminal
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-10 animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-red-100 rounded-4xl flex items-center justify-center shadow-xl shadow-red-500/5">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-zinc-950 uppercase italic tracking-tighter underline decoration-zinc-100 underline-offset-8">
                  Execution Fault.
                </h3>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-sm mx-auto italic">
                  {errorMessage || "The distributed network rejected the settlement parameters. Check protocol connectivity."}
                </p>
              </div>
              <button
                onClick={() => setStep("input")}
                className="w-full h-16 rounded-2xl bg-zinc-950 text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-orange-600 transition-all active:scale-95"
              >
                Retry Transaction Sequence
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
