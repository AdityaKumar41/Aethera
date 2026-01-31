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
  const [amount, setAmount] = useState(1);
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

  // KYC is required for all investments
  const canInvest = kycStatus?.verificationStatus === "APPROVED";

  const handleInvest = async () => {
    if (!project) return;
    setStep("processing");

    setErrorMessage(null);
    try {
      const result = await settle(project.id, amount);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-white/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white border border-zinc-200 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 fade-in duration-300 max-h-[85vh] flex flex-col">
        {/* Header Ribbon */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-orange-400 via-orange-500 to-amber-400" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 overflow-y-auto flex-1">
          {step === "input" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-orange-100 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                    New Opportunity
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight leading-none">
                  Invest in{" "}
                  <span className="text-orange-500 font-black italic">
                    {project.name}
                  </span>
                </h2>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-2">
                  {project.location} • {project.expectedYield}% APY • $
                  {project.pricePerToken}/token
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                    Select Tokens
                  </p>
                  <div className="flex items-center gap-4 bg-zinc-50 p-2 border border-zinc-100 rounded-3xl">
                    <button
                      onClick={() => setAmount(Math.max(1, amount - 1))}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-all shadow-sm active:scale-90"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center font-black text-2xl text-zinc-900">
                      {amount}
                    </div>
                    <button
                      onClick={() => setAmount(amount + 1)}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-all shadow-sm active:scale-90"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[1, 5, 10, 50].map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val)}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          amount === val
                            ? "bg-zinc-900 border-zinc-900 text-white"
                            : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300",
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="p-6 rounded-3xl bg-zinc-900 text-white space-y-2 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-white/20 transition-all" />
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] relative z-10">
                      Total Investment
                    </p>
                    <div className="flex items-baseline gap-2 relative z-10">
                      <span className="text-4xl font-black">
                        ${totalInvestment.toLocaleString()}
                      </span>
                      <span className="text-sm font-bold text-white/40 uppercase">
                        USDC
                      </span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-5 rounded-3xl border space-y-3 transition-all",
                      hasEnoughBalance
                        ? "bg-zinc-50 border-zinc-100"
                        : "bg-red-50 border-red-100",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet
                          className={cn(
                            "w-4 h-4",
                            hasEnoughBalance
                              ? "text-emerald-500"
                              : "text-red-500",
                          )}
                        />
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          Available Balance
                        </span>
                      </div>
                      {!hasEnoughBalance && (
                        <span className="text-[8px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                          Insufficient
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xl font-black leading-none",
                        hasEnoughBalance ? "text-zinc-900" : "text-red-700",
                      )}
                    >
                      {balancesLoading
                        ? "..."
                        : `${usdcBalance.toLocaleString()} USDC`}
                    </p>
                    {!hasEnoughBalance && pendingUsdc > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-orange-100/50 rounded-xl border border-orange-200">
                        <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                        <p className="text-[9px] font-bold text-orange-700 leading-tight">
                          You have {pendingUsdc} USDC pending in your wallet.
                          Claim them to proceed.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-3xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    Asset Details
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500">
                        Price per Token
                      </span>
                      <span className="text-sm font-black text-zinc-900">
                        ${project.pricePerToken}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500">
                        Asset Symbol
                      </span>
                      <span className="text-sm font-black text-orange-600">
                        {project.tokenSymbol}
                      </span>
                    </div>
                  </div>
                </div>
                <Coins className="w-8 h-8 text-zinc-200" />
              </div>

              <button
                disabled={!hasEnoughBalance || !canInvest}
                onClick={() => setStep("confirm")}
                className={cn(
                  "w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-sm transition-all shadow-xl active:scale-95",
                  hasEnoughBalance && canInvest
                    ? "bg-zinc-900 text-white hover:bg-orange-600 shadow-orange-500/10"
                    : "bg-zinc-100 text-zinc-300 border border-zinc-200 cursor-not-allowed",
                )}
              >
                Continue to Payment
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-8 pt-2 opacity-50">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Secure Settlement
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Verifiable On-Chain
                  </span>
                </div>
              </div>

              {!canInvest && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                  <p className="text-xs font-bold text-orange-900 mb-2">
                    KYC Verification Required
                  </p>
                  <p className="text-[10px] text-orange-700 leading-relaxed">
                    Please complete KYC verification in Settings to invest in
                    solar projects.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-8 py-4 animate-in slide-in-from-right-8 fade-in duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-zinc-900 italic tracking-tight uppercase">
                  Confirm Order
                </h3>
                <p className="text-zinc-500 text-sm font-medium">
                  Please review your purchase details below.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-zinc-500 uppercase tracking-widest text-xs">
                    Project
                  </span>
                  <span className="font-black text-zinc-900">
                    {project.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-zinc-500 uppercase tracking-widest text-xs">
                    Quantity
                  </span>
                  <span className="font-black text-zinc-900">
                    {amount} Tokens
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-zinc-500 uppercase tracking-widest text-xs">
                    Unit Cost
                  </span>
                  <span className="font-black text-zinc-900">
                    ${project.pricePerToken} USDC
                  </span>
                </div>
                <div className="h-px bg-zinc-200 my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-black text-zinc-900 uppercase tracking-[0.2em] text-xs">
                    Total Amount
                  </span>
                  <span className="text-2xl font-black text-orange-600">
                    ${totalInvestment.toLocaleString()} USDC
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleInvest}
                  disabled={settling}
                  className="w-full h-16 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-orange-500/10 flex items-center justify-center gap-3"
                >
                  {settling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Verify & Settle Purchase"
                  )}
                </button>
                <button
                  onClick={() => setStep("input")}
                  className="w-full py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:text-zinc-900 transition-colors"
                >
                  Hold on, I need to change something
                </button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-20 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-zinc-50 border-t-orange-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-orange-500 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight italic">
                  Relaying Transaction
                </h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                  Connecting to the Stellar Ledger to finalize your asset
                  acquisition and mint tokens.
                </p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-zinc-50 border border-zinc-100 rounded-2xl w-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">
                  Consensus Reaching...
                </span>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 space-y-8 animate-in zoom-in-95 fade-in duration-700">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center border border-zinc-100 shadow-lg">
                    <Sun className="w-6 h-6 text-orange-500 animate-spin-slow" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-3">
                <h3 className="text-3xl font-black text-zinc-900 tracking-tight italic uppercase">
                  Asset Acquired!
                </h3>
                <p className="text-zinc-500 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                  Success! {amount} tokens of <strong>{project.name}</strong>{" "}
                  have been settled and are now in your vault.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Transaction Hash
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-black text-orange-600 hover:text-orange-700 underline underline-offset-4"
                  >
                    View Explorer
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="w-full p-3 bg-white border border-zinc-100 rounded-xl font-mono text-[10px] text-zinc-400 truncate">
                  {txHash}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full h-16 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-emerald-500/10"
              >
                Return to Portfolio
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
                  Transaction Failed
                </h3>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
                  {errorMessage ||
                    "The network rejected the settlement or the connection was lost. Ensure your wallet is correctly linked."}
                </p>
                {errorMessage?.toLowerCase().includes("trustline") && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-orange-900">
                      USDC Trustline Required
                    </p>
                    <p className="text-[10px] text-orange-700 leading-relaxed">
                      Please enable USDC in your wallet settings to invest in
                      solar projects.
                    </p>
                  </div>
                )}
                {!errorMessage?.includes("XLM") &&
                  !errorMessage?.toLowerCase().includes("trustline") && (
                    <p className="text-[10px] text-zinc-400 font-bold uppercase mt-4">
                      Note: Gas Fees are sponsored by Aethera Relayer
                    </p>
                  )}
              </div>
              <button
                onClick={() => setStep("input")}
                className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all active:scale-95"
              >
                Review Settings & Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
