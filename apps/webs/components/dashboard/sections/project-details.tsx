"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Zap,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Users,
  Coins,
  Signal,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectApi, type Project } from "@/lib/api";
import { MilestoneTracker } from "./milestone-tracker";
import { IoTDeviceManager } from "./iot-device-manager";

interface ProjectDetailsSectionProps {
  projectId: string;
  onBack: () => void;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; dot: string; icon: any }
> = {
  DRAFT: {
    label: "Draft",
    color: "text-zinc-600",
    bg: "bg-zinc-100",
    dot: "bg-zinc-400",
    icon: Clock,
  },
  PENDING_APPROVAL: {
    label: "Under Review",
    color: "text-amber-700",
    bg: "bg-amber-100",
    dot: "bg-amber-500",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    color: "text-blue-700",
    bg: "bg-blue-100",
    dot: "bg-blue-500",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-100",
    dot: "bg-red-500",
    icon: XCircle,
  },
  FUNDING: {
    label: "Funding",
    color: "text-purple-700",
    bg: "bg-purple-100",
    dot: "bg-purple-500",
    icon: DollarSign,
  },
  FUNDED: {
    label: "Funded",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  ACTIVE_PENDING_DATA: {
    label: "Awaiting IoT Data",
    color: "text-orange-700",
    bg: "bg-orange-100",
    dot: "bg-orange-500",
    icon: Signal,
  },
  ACTIVE: {
    label: "Active",
    color: "text-green-700",
    bg: "bg-green-100",
    dot: "bg-green-500 animate-pulse",
    icon: Zap,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-zinc-600",
    bg: "bg-zinc-100",
    dot: "bg-zinc-400",
    icon: CheckCircle2,
  },
};

export function ProjectDetailsSection({
  projectId,
  onBack,
}: ProjectDetailsSectionProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const response = await projectApi.getProject(projectId);
      if (response.success && response.data) {
        setProject(response.data);
      } else {
        setError(response.error || "Failed to load project details");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-500">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-white border border-zinc-100 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="font-semibold text-zinc-900 mb-2">
          Failed to load project
        </h3>
        <p className="text-sm text-zinc-500 mb-5">
          {error || "Project not found."}
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const statusInfo =
    statusConfig[project.status as keyof typeof statusConfig] ||
    statusConfig.DRAFT;
  const fundingProgress =
    Number(project.fundingTarget) > 0
      ? (Number(project.fundingRaised) / Number(project.fundingTarget)) * 100
      : 0;
  const showIoT = ["ACTIVE", "ACTIVE_PENDING_DATA", "FUNDED"].includes(
    project.status,
  );
  const showAlert = ["FUNDED", "ACTIVE_PENDING_DATA"].includes(project.status);

  return (
    <div className="space-y-5">
      {/* Back navigation + action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          My Projects
        </button>
        {project.status === "ACTIVE" && (
          <a
            href="/dashboard/production"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Activity className="w-4 h-4" />
            Report Production
          </a>
        )}
      </div>

      {/* Alert banner */}
      {showAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {project.status === "FUNDED"
              ? "Action required — your project is funded. Connect an IoT device below to activate it and release capital."
              : "Waiting for IoT data — connect a device below to start tracking energy production and earning yield."}
          </p>
        </div>
      )}

      {/* Title row */}
      <div>
        <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
          <h1 className="text-xl font-bold text-zinc-900">{project.name}</h1>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              statusInfo.bg,
              statusInfo.color,
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", statusInfo.dot)} />
            {statusInfo.label}
          </span>
          {project.tokenSymbol && (
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-mono font-medium">
              {project.tokenSymbol}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {project.location}
            {project.country ? `, ${project.country}` : ""}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            {project.capacity} kW
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Overview */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              About this Project
            </h2>
            <p className="text-zinc-700 text-sm leading-relaxed">
              {project.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-zinc-100">
              {[
                {
                  label: "Capacity",
                  value: `${project.capacity} kW`,
                  icon: Zap,
                  accent: "text-amber-500",
                },
                {
                  label: "Expected Yield",
                  value: `${project.expectedYield}% APY`,
                  icon: TrendingUp,
                  accent: "text-emerald-500",
                },
                {
                  label: "Token Price",
                  value: `$${project.pricePerToken} USDC`,
                  icon: Coins,
                  accent: "text-blue-500",
                },
                {
                  label: "Funding Model",
                  value:
                    project.fundingModel === "MILESTONE_BASED"
                      ? "Milestone-Based"
                      : "Full Upfront",
                  icon: ShieldCheck,
                  accent: "text-purple-500",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className={cn("w-3.5 h-3.5", item.accent)} />
                    <p className="text-xs text-zinc-400">{item.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* IoT Device Management */}
          {showIoT && (
            <div className="bg-white border border-zinc-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Signal className="w-4 h-4 text-emerald-500" />
                <h2 className="font-semibold text-zinc-900">
                  IoT Device Management
                </h2>
              </div>
              <p className="text-sm text-zinc-500 mb-5">
                Connect IoT devices to enable real-time energy production
                tracking.
              </p>
              <IoTDeviceManager projectId={project.id} />
            </div>
          )}

          {/* Milestone Tracker */}
          {project.fundingModel === "MILESTONE_BASED" && (
            <div className="bg-white border border-zinc-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold text-zinc-900">
                  Project Milestones
                </h2>
              </div>
              <MilestoneTracker
                projectId={project.id}
                onUpdate={fetchProject}
              />
            </div>
          )}

          {/* Investment Performance */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold text-zinc-900">
                Investment Performance
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Expected Yield",
                  value: `${project.expectedYield}%`,
                  sub: "per year",
                  bold: "text-emerald-600",
                },
                {
                  label: "Price Per Token",
                  value: `$${project.pricePerToken}`,
                  sub: "USDC",
                  bold: "text-zinc-900",
                },
                {
                  label: "Total Tokens",
                  value: project.totalTokens?.toLocaleString() ?? "—",
                  sub: "issued",
                  bold: "text-zinc-900",
                },
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-50 rounded-xl p-4">
                  <p className="text-xs text-zinc-400 mb-2">{stat.label}</p>
                  <p className={cn("text-xl font-bold", stat.bold)}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-5">
          {/* Funding Status */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6">
            <h2 className="font-semibold text-zinc-900 mb-5">Funding Status</h2>

            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Raised</p>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                  ${Number(project.fundingRaised).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400 mb-1">Target</p>
                <p className="text-base font-semibold text-zinc-400">
                  ${Number(project.fundingTarget).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-1.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  fundingProgress >= 100 ? "bg-emerald-500" : "bg-blue-500",
                )}
                style={{ width: `${Math.min(fundingProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 text-right mb-5">
              {Math.round(fundingProgress)}% funded
            </p>

            <div className="space-y-3 pt-4 border-t border-zinc-100">
              {[
                {
                  label: "Tokens Issued",
                  value: project.totalTokens?.toLocaleString() ?? "—",
                  icon: Coins,
                  accent: "text-blue-500",
                },
                {
                  label: "Available",
                  value: project.tokensRemaining?.toLocaleString() ?? "—",
                  icon: ShieldCheck,
                  accent: "text-purple-500",
                },
                {
                  label: "Investors",
                  value: String(project.investorCount ?? 0),
                  icon: Users,
                  accent: "text-emerald-500",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <item.icon className={cn("w-3.5 h-3.5", item.accent)} />
                    {item.label}
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Network */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6">
            <h2 className="font-semibold text-zinc-900 mb-4">Network</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Chain</span>
                <span className="text-sm font-mono font-medium text-zinc-700">
                  Stellar Testnet
                </span>
              </div>

              {project.tokenSymbol && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Token</span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/asset/${project.tokenSymbol}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {project.tokenSymbol}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {project.status === "ACTIVE" && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <p className="text-xs text-zinc-400 mb-1">
                    Total Energy Produced
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                      {Number(
                        project.totalEnergyProduced || 0,
                      ).toLocaleString()}
                    </p>
                    <span className="text-sm text-zinc-400">kWh</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs text-zinc-400">Live from sensors</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
