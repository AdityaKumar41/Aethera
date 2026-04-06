"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useClaimTokens,
  useInvestmentSettlement,
  useKyc,
  useWalletBalances,
} from "@/hooks/use-dashboard-data";
import type { Project } from "@/lib/api";
import { ViewportPortal } from "@/components/ui/viewport-portal";

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
  const [completionState, setCompletionState] = useState<
    "submitted" | "confirmed"
  >("submitted");

  const {
    balances,
    loading: balancesLoading,
    refetch: refetchBalances,
  } = useWalletBalances();
  const { claim, loading: claimingBalances } = useClaimTokens();
  const { status: kycStatus } = useKyc();
  const {
    settle,
    waitForConfirmation,
    loading: settling,
    confirming,
  } = useInvestmentSettlement();

  useEffect(() => {
    if (isOpen) {
      setAmount(1);
      setStep("input");
      setTxHash(null);
      setErrorMessage(null);
      setCompletionState("submitted");
      refetchBalances();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, refetchBalances]);

  const usdcBalance = useMemo(() => {
    if (!balances?.balances) return 0;

    const usdcAsset = balances.balances.find(
      (balance) => balance.asset.toUpperCase() === "USDC",
    );

    return usdcAsset ? Number(usdcAsset.balance) : 0;
  }, [balances]);

  const pendingUsdc = useMemo(() => {
    if (!balances?.claimableBalances) return 0;

    return balances.claimableBalances
      .filter((balance) => String(balance.asset || "") === "USDC")
      .reduce((sum, balance) => sum + Number(balance.amount), 0);
  }, [balances]);

  const totalInvestment = amount * (Number(project?.pricePerToken) || 0);
  const hasEnoughBalance = usdcBalance >= totalInvestment;
  const canInvest = kycStatus?.status === "VERIFIED";
  const meetsMinimum = totalInvestment >= 100;
  const isActionable = hasEnoughBalance && canInvest && meetsMinimum;

  const handleClaimPendingBalances = async () => {
    const result = await claim();

    if (result.success) {
      await refetchBalances();
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || "Failed to claim pending wallet balances.");
    }
  };

  const handleInvest = async () => {
    if (!project) return;

    setStep("processing");
    setErrorMessage(null);

    try {
      const result = await settle(project.id, totalInvestment);

      if (!result.success) {
        setErrorMessage(
          result.error || "The investment could not be submitted.",
        );
        setStep("error");
        return;
      }

      setTxHash(result.txHash || null);
      onSuccess?.();

      if (result.investmentId) {
        const confirmation = await waitForConfirmation(result.investmentId);

        if (!confirmation.success) {
          setErrorMessage(
            confirmation.error ||
              "The investment transaction failed before confirmation.",
          );
          setStep("error");
          return;
        }

        setTxHash(confirmation.txHash || result.txHash || null);
        setCompletionState(
          confirmation.status === "CONFIRMED" ? "confirmed" : "submitted",
        );
      } else {
        setCompletionState("submitted");
      }

      setStep("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during settlement.",
      );
      setStep("error");
    }
  };

  if (!isOpen || !project) return null;

  return (
    <ViewportPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-2xl border border-zinc-200 bg-white p-2.5 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="border-b border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#fafaf9_100%)] px-6 py-6 text-zinc-950 lg:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                Invest in Project
              </span>
              {project.tokenSymbol && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-mono text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                  {project.tokenSymbol}
                </span>
              )}
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">
              {project.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-orange-400" />
                {project.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-400" />
                ${Number(project.pricePerToken).toLocaleString()} per token
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
            {step === "input" && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                    <p className="text-sm font-semibold text-zinc-900">
                      Choose Token Amount
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Each token is priced at $
                      {Number(project.pricePerToken).toLocaleString()} USDC.
                    </p>

                    <div className="mt-5 flex items-center gap-4">
                      <button
                        onClick={() => setAmount(Math.max(1, amount - 1))}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 transition-colors hover:bg-zinc-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                          Tokens
                        </p>
                        <p className="mt-1 text-3xl font-bold text-zinc-950">
                          {amount}
                        </p>
                      </div>
                      <button
                        onClick={() => setAmount(amount + 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 transition-colors hover:bg-zinc-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {[1, 5, 10, 25].map((value) => (
                        <button
                          key={value}
                          onClick={() => setAmount(value)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                            amount === value
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                      <p className="text-sm font-semibold text-zinc-900">
                        Investment Summary
                      </p>
                      <div className="mt-4 space-y-3 text-sm">
                        <SummaryRow label="Token amount" value={`${amount}`} />
                        <SummaryRow
                          label="Price per token"
                          value={`$${Number(project.pricePerToken).toLocaleString()} USDC`}
                        />
                        <SummaryRow
                          label="Expected yield"
                          value={`${project.expectedYield}% APY`}
                        />
                      </div>
                      <div className="mt-4 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 px-4 py-4 text-white">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                          Total to pay
                        </p>
                        <p className="mt-1 text-3xl font-bold">
                          ${totalInvestment.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm font-semibold text-zinc-900">
                          Wallet Balance
                        </p>
                      </div>
                      <p className="mt-3 text-2xl font-bold text-zinc-950">
                        {balancesLoading
                          ? "Loading..."
                          : `${usdcBalance.toLocaleString()} USDC`}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Your wallet must have enough USDC and a verified KYC
                        status before the transaction can be submitted.
                      </p>

                      {pendingUsdc > 0 && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-sm font-semibold text-amber-900">
                            Pending wallet balances detected
                          </p>
                          <p className="mt-1 text-sm text-amber-700">
                            {pendingUsdc.toLocaleString()} USDC is claimable but
                            not spendable yet.
                          </p>
                          <button
                            onClick={handleClaimPendingBalances}
                            disabled={claimingBalances}
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
                          >
                            {claimingBalances ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Claiming...
                              </>
                            ) : (
                              "Claim Pending USDC"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!hasEnoughBalance && (
                  <NoticeCard
                    tone="error"
                    title="Not enough USDC"
                    description="Fund your wallet before submitting this investment."
                  />
                )}

                {!canInvest && (
                  <NoticeCard
                    tone="neutral"
                    title="KYC verification required"
                    description="Investments are only available to verified investors."
                  />
                )}

                {!meetsMinimum && (
                  <NoticeCard
                    tone="neutral"
                    title="Minimum investment not met"
                    description="The current investor flow requires at least $100 USDC per transaction."
                  />
                )}

                <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row">
                  <button
                    onClick={onClose}
                    className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!isActionable}
                    onClick={() => setStep("confirm")}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors",
                      isActionable
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "cursor-not-allowed bg-zinc-100 text-zinc-400",
                    )}
                  >
                    Continue to Confirmation
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Confirm Investment
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Review the amount before the transaction is relayed to the
                    Stellar treasury flow.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                  <div className="space-y-3 text-sm">
                    <SummaryRow label="Project" value={project.name} />
                    <SummaryRow label="Token amount" value={`${amount}`} />
                    <SummaryRow
                      label="Price per token"
                      value={`$${Number(project.pricePerToken).toLocaleString()} USDC`}
                    />
                    <SummaryRow
                      label="Expected yield"
                      value={`${project.expectedYield}% APY`}
                    />
                  </div>

                  <div className="mt-5 border-t border-zinc-200 pt-4">
                    <SummaryRow
                      label="Total payment"
                      value={`$${totalInvestment.toLocaleString()} USDC`}
                      emphasize
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => setStep("input")}
                    className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleInvest}
                    disabled={settling}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {settling ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Investment
                        <ShieldCheck className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === "processing" && (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-zinc-950">
                    Processing investment
                  </h3>
                  <p className="max-w-md text-sm leading-6 text-zinc-500">
                    {confirming
                      ? "Your transaction was submitted. We are now checking the chain for confirmation."
                      : "We are submitting your transaction to the Stellar treasury flow."}
                  </p>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-zinc-950">
                    {completionState === "confirmed"
                      ? "Investment confirmed"
                      : "Transaction submitted"}
                  </h3>
                  <p className="mx-auto max-w-md text-sm leading-6 text-zinc-500">
                    {completionState === "confirmed"
                      ? `Your investment in ${project.name} is confirmed on-chain.`
                      : `Your investment request for ${project.name} has been submitted and is waiting for final chain confirmation.`}
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-left">
                  <div className="space-y-3 text-sm">
                    <SummaryRow label="Project" value={project.name} />
                    <SummaryRow label="Token amount" value={`${amount}`} />
                    <SummaryRow
                      label="Payment"
                      value={`$${totalInvestment.toLocaleString()} USDC`}
                    />
                    <SummaryRow
                      label="Status"
                      value={
                        completionState === "confirmed"
                          ? "Confirmed"
                          : "Pending on-chain confirmation"
                      }
                    />
                  </div>

                  <div className="mt-5 border-t border-zinc-200 pt-4">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                      Transaction Hash
                    </p>
                    <p className="mt-2 break-all rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-mono text-xs text-zinc-600">
                      {txHash ||
                        "Hash will appear once the relayed transaction is available."}
                    </p>
                    {txHash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        View on Stellar Expert
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Return to Marketplace
                </button>
              </div>
            )}

            {step === "error" && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-zinc-950">
                    Investment failed
                  </h3>
                  <p className="mx-auto max-w-md text-sm leading-6 text-zinc-500">
                    {errorMessage ||
                      "The transaction could not be completed. Please review the details and try again."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={onClose}
                    className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setStep("input")}
                    className="flex-1 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ViewportPortal>
  );
}

function SummaryRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span
        className={cn(
          "text-right font-medium text-zinc-900",
          emphasize && "text-lg font-bold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function NoticeCard({
  tone,
  title,
  description,
}: {
  tone: "error" | "neutral";
  title: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        tone === "error"
          ? "border-red-200 bg-red-50"
          : "border-zinc-200 bg-zinc-50",
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            tone === "error" ? "text-red-500" : "text-zinc-400",
          )}
        />
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              tone === "error" ? "text-red-700" : "text-zinc-900",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              tone === "error" ? "text-red-600" : "text-zinc-500",
            )}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
