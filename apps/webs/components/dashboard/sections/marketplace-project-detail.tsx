"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  DollarSign,
  ExternalLink,
  Loader2,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectApi, type Project } from "@/lib/api";
import { InvestModal } from "@/components/dashboard/invest-modal";

interface MarketplaceProjectDetailSectionProps {
  projectId: string;
}

const statusMeta: Record<
  string,
  { label: string; badge: string; note: string }
> = {
  FUNDING: {
    label: "Open to Invest",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    note: "Investments are live and settle through the Stellar treasury flow.",
  },
  FUNDED: {
    label: "Fully Funded",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    note: "Primary allocation is complete for this project.",
  },
  ACTIVE_PENDING_DATA: {
    label: "Activation Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    note: "Funding is complete and the project is waiting for operational data.",
  },
  ACTIVE: {
    label: "Producing",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    note: "The solar asset is active and producing energy.",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-zinc-100 text-zinc-700 border-zinc-200",
    note: "Project lifecycle is complete.",
  },
};

export function MarketplaceProjectDetailSection({
  projectId,
}: MarketplaceProjectDetailSectionProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const response = await projectApi.getProject(projectId);
      if (response.success && response.data) {
        setProject(response.data);
        setError(null);
      } else {
        setError(response.error || "Failed to load project details");
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load project details",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const derived = useMemo(() => {
    if (!project) {
      return null;
    }

    const fundingRaised = Number(project.fundingRaised || 0);
    const fundingTarget = Number(project.fundingTarget || 0);
    const fundingProgress =
      fundingTarget > 0 ? (fundingRaised / fundingTarget) * 100 : 0;
    const tokenContractId = project.tokenContractId?.trim() || null;
    const tokenDeployed = Boolean(tokenContractId);
    const remainingFunding = Math.max(0, fundingTarget - fundingRaised);
    const remainingTokens = Number(project.tokensRemaining || 0);
    const canInvest =
      project.status === "FUNDING" && tokenDeployed && remainingTokens > 0;

    let blockedReason =
      "This project is not currently open for new primary-market investments.";

    if (!tokenDeployed) {
      blockedReason =
        "Token deployment is still pending. Investment opens after the Stellar contract is live.";
    } else if (project.status !== "FUNDING") {
      blockedReason =
        "This project has moved beyond the live funding stage, so primary allocation is closed.";
    } else if (remainingTokens <= 0) {
      blockedReason =
        "All currently issued tokens have been allocated for this project.";
    }

    return {
      fundingRaised,
      fundingTarget,
      fundingProgress,
      tokenContractId,
      tokenDeployed,
      remainingFunding,
      remainingTokens,
      canInvest,
      blockedReason,
      tokenExplorerUrl: tokenContractId
        ? `https://stellar.expert/explorer/testnet/contract/${tokenContractId}`
        : null,
    };
  }, [project]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-500">Loading project details...</p>
      </div>
    );
  }

  if (error || !project || !derived) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/dashboard/marketplace")}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Marketplace
        </button>

        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Unable to load project
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {error || "This project could not be found."}
          </p>
          <button
            onClick={() => router.push("/dashboard/marketplace")}
            className="mt-6 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const meta = statusMeta[project.status] || {
    label: project.status.replace(/_/g, " "),
    badge: "bg-zinc-100 text-zinc-700 border-zinc-200",
    note: "Project details and tokenization status for investors.",
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/marketplace")}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </button>

      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                  meta.badge,
                )}
              >
                {meta.label}
              </span>
              {project.tokenSymbol && (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-mono text-zinc-700">
                  {project.tokenSymbol}
                </span>
              )}
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                Stellar Testnet
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 lg:text-4xl">
                {project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  {project.location}, {project.country}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  {project.capacity} kW capacity
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-zinc-600">
                {project.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Expected Yield",
                  value: `${project.expectedYield}% APY`,
                  icon: TrendingUp,
                  tone: "text-emerald-600",
                },
                {
                  label: "Price Per Token",
                  value: `$${Number(project.pricePerToken).toLocaleString()} USDC`,
                  icon: Coins,
                  tone: "text-blue-600",
                },
                {
                  label: "Funding Model",
                  value:
                    project.fundingModel === "MILESTONE_BASED"
                      ? "Milestone-Based"
                      : "Full Upfront",
                  icon: ShieldCheck,
                  tone: "text-purple-600",
                },
                {
                  label: "Available Tokens",
                  value: derived.remainingTokens.toLocaleString(),
                  icon: Wallet,
                  tone: "text-orange-600",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <item.icon className={cn("h-4 w-4", item.tone)} />
                    <p className="text-xs font-medium text-zinc-500">
                      {item.label}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    Investor Readiness
                  </h2>
                  <p className="text-sm text-zinc-500">{meta.note}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    derived.canInvest
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-200 text-zinc-700",
                  )}
                >
                  {derived.canInvest ? "Investment Open" : "Investment Closed"}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ReadinessItem
                  ok={project.status === "FUNDING"}
                  title="Funding Stage"
                  description="Project must be in live funding before primary investment opens."
                />
                <ReadinessItem
                  ok={derived.tokenDeployed}
                  title="Token Deployment"
                  description="A real Stellar contract must exist before the asset can be allocated."
                />
                <ReadinessItem
                  ok={derived.remainingTokens > 0}
                  title="Allocation Available"
                  description="There must still be issued supply available in the current funding round."
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Funding Status
              </p>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-white/60">Raised</p>
                  <p className="text-3xl font-bold">
                    ${derived.fundingRaised.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/60">Target</p>
                  <p className="text-lg font-semibold text-white/80">
                    ${derived.fundingTarget.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.min(derived.fundingProgress, 100)}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-white/70">
                <span>{Math.round(derived.fundingProgress)}% funded</span>
                <span>${derived.remainingFunding.toLocaleString()} remaining</span>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900">
                Network & Token
              </h2>
              <div className="mt-4 space-y-4 text-sm">
                <DetailRow label="Network" value="Stellar Testnet" mono />
                <DetailRow
                  label="Ticker"
                  value={project.tokenSymbol || "Pending"}
                  mono
                />
                <DetailRow
                  label="Asset Status"
                  value={
                    derived.tokenDeployed
                      ? "Live contract deployed"
                      : "Awaiting deployment"
                  }
                />
              </div>

              {derived.tokenExplorerUrl ? (
                <a
                  href={derived.tokenExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  View on Stellar Expert
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <p className="mt-5 text-sm text-zinc-500">
                  Explorer link appears after the contract is deployed.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900">
                Invest in This Project
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Primary-market investments settle in USDC and then move through
                on-chain confirmation before token allocation is finalized.
              </p>

              {derived.canInvest ? (
                <button
                  onClick={() => setIsInvestModalOpen(true)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                >
                  Invest Now
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
                  {derived.blockedReason}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <InvestModal
        project={project}
        isOpen={isInvestModalOpen}
        onClose={() => setIsInvestModalOpen(false)}
        onSuccess={fetchProject}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span
        className={cn(
          "text-right font-medium text-zinc-900",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ReadinessItem({
  ok,
  title,
  description,
}: {
  ok: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-zinc-300" />
        )}
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}
