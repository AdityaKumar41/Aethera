"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Loader2, AlertCircle, CheckCircle, Wallet, TrendingUp, MapPin, Zap, Shield } from "lucide-react";
import { useInvestment } from "@/hooks/use-investment";
import { useKyc, useWalletBalances } from "@/hooks/use-dashboard-data";
import { toast } from "sonner";
import type { Project } from "@/lib/api";

interface InvestModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InvestModal({ project, isOpen, onClose, onSuccess }: InvestModalProps) {
  const [tokenAmount, setTokenAmount] = useState<number>(1);
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success" | "error">("input");
  
  const { invest, status: investStatus, loading: investing, error: investError } = useInvestment();
  const { status: kycStatus, loading: kycLoading } = useKyc();
  const { balances, loading: balancesLoading } = useWalletBalances();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTokenAmount(1);
      setStep("input");
    }
  }, [isOpen]);

  // Handle investment status changes
  useEffect(() => {
    if (investStatus === "confirmed") {
      setStep("success");
    } else if (investStatus === "failed") {
      setStep("error");
    }
  }, [investStatus]);

  if (!isOpen || !project) return null;

  const pricePerToken = project.pricePerToken || 100;
  const totalCost = tokenAmount * pricePerToken;
  const maxTokens = project.tokensRemaining || 0;
  const isKycVerified = kycStatus?.status === "VERIFIED";
  
  // Find USDC balance (with null safety)
  const usdcBalance = balances?.balances?.find(b => 
    b?.asset?.includes?.("USDC") || b?.asset === "USDC"
  );
  const availableUSDC = usdcBalance ? parseFloat(usdcBalance.balance || "0") : 0;
  const hasEnoughBalance = availableUSDC >= totalCost;

  const handleSubmit = async () => {
    if (!isKycVerified) {
      toast.error("KYC verification required", {
        description: "Please complete your identity verification before investing."
      });
      return;
    }

    if (!hasEnoughBalance) {
      toast.error("Insufficient USDC balance", {
        description: `You need ${totalCost.toFixed(2)} USDC but only have ${availableUSDC.toFixed(2)} USDC.`
      });
      return;
    }

    setStep("confirm");
  };

  const handleConfirm = async () => {
    setStep("processing");
    
    const result = await invest({
      projectId: project.id,
      amount: totalCost,
    });

    if (result.success) {
      toast.success("Investment submitted!", {
        description: "Your transaction is being processed on the blockchain."
      });
      // Don't close yet - wait for confirmation or let user close
    } else {
      toast.error("Investment failed", {
        description: result.error || "Please try again."
      });
      setStep("error");
    }
  };

  const handleClose = () => {
    if (step === "success" && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step !== "processing" ? handleClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
          <button
            onClick={handleClose}
            disabled={step === "processing"}
            className="absolute top-4 right-4 p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-xl font-bold text-white mb-1">Invest in Project</h2>
          <p className="text-white/80 text-sm">{project.name}</p>
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <div className="p-6 space-y-5">
            {/* Project Quick Info */}
            <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  {project.location}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-emerald-600">{project.expectedYield}% APY</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm">{project.capacity} kW</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KYC Status */}
            {!kycLoading && !isKycVerified && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">KYC Required</p>
                  <p className="text-xs">Complete verification in Settings before investing.</p>
                </div>
              </div>
            )}

            {/* Token Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Tokens</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTokenAmount(Math.max(1, tokenAmount - 1))}
                  className="w-10 h-10 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxTokens}
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(Math.min(maxTokens, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="flex-1 h-10 text-center text-lg font-semibold rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  onClick={() => setTokenAmount(Math.min(maxTokens, tokenAmount + 1))}
                  className="w-10 h-10 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors font-bold"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {maxTokens.toLocaleString()} tokens available • ${pricePerToken} per token
              </p>
            </div>

            {/* Quick Amounts */}
            <div className="flex gap-2">
              {[1, 5, 10, 25].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTokenAmount(Math.min(maxTokens, amount))}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                    tokenAmount === amount
                      ? "bg-foreground text-background"
                      : "bg-zinc-100 hover:bg-zinc-200"
                  )}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Cost Summary */}
            <div className="p-4 bg-zinc-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Token Price</span>
                <span>${pricePerToken.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span>× {tokenAmount}</span>
              </div>
              <div className="border-t border-zinc-200 pt-2 flex items-center justify-between font-semibold">
                <span>Total Cost</span>
                <span className="text-lg">${totalCost.toFixed(2)} USDC</span>
              </div>
            </div>

            {/* Wallet Balance */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl",
              hasEnoughBalance ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            )}>
              <Wallet className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {balancesLoading ? "Loading balance..." : `${availableUSDC.toFixed(2)} USDC available`}
                </p>
                {!hasEnoughBalance && !balancesLoading && (
                  <p className="text-xs">Insufficient balance for this investment</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!isKycVerified || !hasEnoughBalance || balancesLoading}
              className={cn(
                "w-full py-3 rounded-xl font-semibold transition-all",
                isKycVerified && hasEnoughBalance
                  ? "bg-foreground text-background hover:opacity-90"
                  : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
              )}
            >
              Continue to Review
            </button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="p-6 space-y-5">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Confirm Investment</h3>
              <p className="text-muted-foreground text-sm">
                You are about to invest in {project.name}
              </p>
            </div>

            <div className="p-4 bg-zinc-50 rounded-xl space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Project</span>
                <span className="font-medium">{project.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tokens</span>
                <span className="font-medium">{tokenAmount} {project.tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected Yield</span>
                <span className="font-medium text-emerald-600">{project.expectedYield}% APY</span>
              </div>
              <div className="border-t border-zinc-200 pt-3 flex justify-between font-semibold">
                <span>Total Investment</span>
                <span>${totalCost.toFixed(2)} USDC</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              By confirming, you agree to the investment terms. This transaction will be processed on the Stellar blockchain.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("input")}
                className="flex-1 py-3 rounded-xl font-medium bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={investing}
                className="flex-1 py-3 rounded-xl font-semibold bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {investing ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Confirm & Invest"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="p-6 py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Processing Investment</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Your transaction is being submitted to the Stellar blockchain. This may take a few moments.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Waiting for blockchain confirmation...
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="p-6 py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Investment Successful!</h3>
            <p className="text-muted-foreground text-sm mb-6">
              You now own {tokenAmount} {project.tokenSymbol} tokens in {project.name}.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="p-6 py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Investment Failed</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {investError || "Something went wrong. Please try again."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl font-medium bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setStep("input")}
                className="flex-1 py-3 rounded-xl font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
