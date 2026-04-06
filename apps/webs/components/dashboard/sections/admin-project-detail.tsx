"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Clock,
  DollarSign,
  Building2,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminApi, milestoneApi, type Project, type ProjectMilestone } from "@/lib/api";
import { toast } from "sonner";

interface AdminProjectDetailSectionProps {
  projectId: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  PENDING_APPROVAL: { label: "Pending Review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Approved", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
  FUNDING: { label: "Funding Live", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FUNDED: { label: "Fully Funded", cls: "bg-green-50 text-green-700 border-green-200" },
  ACTIVE_PENDING_DATA: { label: "Active (Pending Data)", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  ACTIVE: { label: "Active", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  COMPLETED: { label: "Completed", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

const MILESTONE_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-zinc-100 text-zinc-500" },
  SUBMITTED: { label: "Awaiting Review", cls: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", cls: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700" },
  RELEASED: { label: "Released ✓", cls: "bg-purple-50 text-purple-700" },
};

export function AdminProjectDetailSection({ projectId }: AdminProjectDetailSectionProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "milestones" | "devices" | "activity">("overview");

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getProject(projectId);
      if (res.success && res.data) {
        setProject(res.data);
      } else {
        toast.error(res.error || "Project not found");
        router.push("/dashboard/admin-projects");
      }
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await milestoneApi.getProjectMilestones(projectId);
      if (res.success && res.data) {
        setMilestones(res.data);
      }
    } catch {
      // silently fail
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchMilestones();
  }, [fetchProject, fetchMilestones]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleApproveAndDeploy = async () => {
    if (!project) return;
    setProcessingAction("approve");
    try {
      if (project.status === "PENDING_APPROVAL") {
        const approveRes = await adminApi.approveProject(project.id);
        if (!approveRes.success) {
          toast.error(approveRes.error || "Approval failed");
          return;
        }
        toast.success("Project approved ✓");
      }
      const deployRes = await adminApi.deployToken(project.id);
      if (!deployRes.success) {
        toast.warning("Approval done, but token deployment failed: " + (deployRes.error || "Unknown error") + ". Click 'Finalize Funding Setup' to retry.");
      } else {
        toast.success("Token deployed and funding setup complete! 🚀");
      }
      await fetchProject();
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeployToken = async () => {
    if (!project) return;
    setProcessingAction("deploy");
    try {
      const res = await adminApi.deployToken(project.id);
      if (res.success) {
        toast.success(
          project.status === "FUNDING"
            ? "Funding setup repaired! 🚀"
            : project.tokenContractId
              ? "Funding setup finalized! 🚀"
              : "Token deployed! 🚀",
        );
        await fetchProject();
      } else {
        toast.error("Deployment failed: " + (res.error || "Unknown error"));
      }
    } catch {
      toast.error("An error occurred during deployment");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async () => {
    if (!project) return;
    const reason = window.prompt("Enter the reason for rejecting this project (min 10 chars):");
    if (!reason || reason.length < 10) {
      if (reason !== null) toast.error("Rejection reason must be at least 10 characters");
      return;
    }
    setProcessingAction("reject");
    try {
      const res = await adminApi.rejectProject(project.id, reason);
      if (res.success) {
        toast.success("Project rejected");
        await fetchProject();
      } else {
        toast.error(res.error || "Rejection failed");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleActivate = async () => {
    if (!project) return;
    setProcessingAction("activate");
    try {
      const res = await adminApi.activateProject(project.id);
      if (res.success) {
        toast.success(res.message || "Project activated!");
        await fetchProject();
      } else {
        toast.error(res.error || "Activation failed");
      }
    } catch {
      toast.error("An error occurred during activation");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleVerifyMilestone = async (milestoneId: string) => {
    setProcessingAction(`milestone-${milestoneId}`);
    try {
      const res = await adminApi.verifyMilestone(milestoneId);
      if (res.success) {
        toast.success("Milestone verified and funds released! 💰");
        await Promise.all([fetchProject(), fetchMilestones()]);
      } else {
        toast.error(res.error || "Verification failed");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectMilestone = async (milestoneId: string) => {
    const reason = window.prompt("Reason for rejecting this milestone:");
    if (!reason) return;
    setProcessingAction(`milestone-${milestoneId}`);
    try {
      const res = await adminApi.rejectMilestone(milestoneId, reason);
      if (res.success) {
        toast.success("Milestone rejected");
        await fetchMilestones();
      } else {
        toast.error(res.error || "Rejection failed");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessingAction(null);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
        <p className="text-zinc-500 text-sm">Loading project details…</p>
      </div>
    );
  }

  if (!project) return null;

  const statusMeta = STATUS_BADGE[project.status] ?? { label: project.status, cls: "bg-zinc-100 text-zinc-600 border-zinc-200" };
  const fundingPct = project.fundingTarget > 0
    ? Math.min(100, (Number(project.fundingRaised) / Number(project.fundingTarget)) * 100)
    : 0;

  const explorerUrl = project.tokenContractId
    ? `https://stellar.expert/explorer/testnet/contract/${project.tokenContractId}`
    : null;

  const isPendingApproval = project.status === "PENDING_APPROVAL";
  const isApproved = project.status === "APPROVED";
  const isFunded = project.status === "FUNDED";
  const canRepairFunding =
    project.status === "FUNDING" &&
    Boolean(project.tokenContractId) &&
    Number(project.fundingRaised || 0) === 0;
  const canDeployOrFinalize = isApproved || canRepairFunding;
  const canReject = isPendingApproval;
  const canActivate = isFunded && (project._count?.iotDevices ?? 0) > 0;

  const isProcessing = processingAction !== null;

  const releasedAmount = Number(project.totalReleasedAmount ?? 0);
  const escrowedAmount = Number(project.totalEscrowedAmount ?? 0);

  const milestoneStats = {
    total: milestones.length,
    released: milestones.filter((m) => m.status === "RELEASED").length,
    submitted: milestones.filter((m) => m.status === "SUBMITTED").length,
    pending: milestones.filter((m) => m.status === "PENDING").length,
  };

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push("/dashboard/admin-projects")}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to All Projects
      </button>

      {/* Header card */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
          {/* Left: name + meta */}
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                  statusMeta.cls,
                )}
              >
                {statusMeta.label}
              </span>
              {project.tokenSymbol && (
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-mono text-zinc-700">
                  {project.tokenSymbol}
                </span>
              )}
              {project.fundingModel && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                    project.fundingModel === "MILESTONE_BASED"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200",
                  )}
                >
                  {project.fundingModel === "MILESTONE_BASED" ? "🎯 Milestone Funding" : "⚡ Full Upfront"}
                </span>
              )}
              {project.tokenContractId && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  Contract Linked
                </span>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-zinc-950">{project.name}</h1>
              <p className="mt-1.5 flex items-center gap-2 text-sm text-zinc-500">
                <MapPin className="w-4 h-4" />
                {project.location}, {project.country}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-zinc-600 max-w-3xl">{project.description}</p>
          </div>

          {/* Right: installer info */}
          <div className="xl:w-[280px] rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Installer</p>
            <div>
              <p className="font-semibold text-zinc-900">
                {project.installer?.company || project.installer?.name || "Independent installer"}
              </p>
              <p className="text-sm text-zinc-500">{project.installer?.email || "No email"}</p>
              {project.installer?.country && (
                <p className="text-sm text-zinc-400">{project.installer.country}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm pt-1">
              <div>
                <p className="text-zinc-400 text-xs">Created</p>
                <p className="font-medium text-zinc-700 text-xs">
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-xs">Approved</p>
                <p className="font-medium text-zinc-700 text-xs">
                  {project.approvedAt ? new Date(project.approvedAt).toLocaleDateString() : "Pending"}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-xs">Est. Completion</p>
                <p className="font-medium text-zinc-700 text-xs">
                  {project.estimatedCompletionDate
                    ? new Date(project.estimatedCompletionDate).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-xs">IoT Devices</p>
                <p className="font-medium text-zinc-700 text-xs">{project._count?.iotDevices ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Funding progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Funding Progress</span>
            <span className="font-semibold text-zinc-900">
              ${Number(project.fundingRaised).toLocaleString()} / ${Number(project.fundingTarget).toLocaleString()} USDC
            </span>
          </div>
          <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${fundingPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{fundingPct.toFixed(1)}% funded</span>
            <span>{project._count?.investments ?? 0} investors</span>
          </div>
        </div>

        {/* Admin action buttons */}
        {project.rejectionReason && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Rejection reason:</strong> {project.rejectionReason}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Approve & Deploy / Finalize Funding */}
          {isPendingApproval && (
            <button
              onClick={handleApproveAndDeploy}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-600/20"
            >
              {processingAction === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve & Deploy Token
            </button>
          )}

          {canDeployOrFinalize && (
            <button
              onClick={handleDeployToken}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-600/20"
            >
              {processingAction === "deploy" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {canRepairFunding
                ? "Repair Token Setup"
                : project.tokenContractId
                  ? "Finalize Funding Setup"
                  : "Deploy Token"}
            </button>
          )}

          {/* Activate */}
          {isFunded && (
            canActivate ? (
              <button
                onClick={handleActivate}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20"
              >
                {processingAction === "activate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Activate Project
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                Waiting for IoT Device
              </div>
            )
          )}

          {/* Reject */}
          {canReject && (
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
            >
              <XCircle className="w-4 h-4" />
              Reject Project
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={() => { fetchProject(); fetchMilestones(); }}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-all ml-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        {[
          { label: "Capacity", value: `${project.capacity} kW` },
          { label: "Expected Yield", value: `${project.expectedYield}%`, sub: "annual" },
          { label: "Price / Token", value: `$${Number(project.pricePerToken).toLocaleString()}` },
          { label: "Total Tokens", value: (project.totalTokens ?? 0).toLocaleString() },
          { label: "Tokens Left", value: (project.tokensRemaining ?? 0).toLocaleString() },
          { label: "Investors", value: String(project._count?.investments ?? 0) },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-400 mb-1">{m.label}</p>
            <p className="text-xl font-bold text-zinc-900">{m.value}</p>
            {m.sub && <p className="text-xs text-zinc-400 mt-0.5">{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-zinc-100 p-1 rounded-2xl flex gap-1 w-fit">
        {(["overview", "milestones", "devices"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize",
              activeTab === tab
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            {tab}
            {tab === "milestones" && milestoneStats.submitted > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                {milestoneStats.submitted}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Token State */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Token State</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Ticker</span>
                <span className="font-mono font-semibold text-zinc-900">{project.tokenSymbol || "—"}</span>
              </div>
              <div className="flex justify-between items-start gap-3">
                <span className="text-zinc-500 shrink-0">Contract</span>
                <span className="font-mono text-[11px] text-zinc-700 break-all text-right">
                  {project.tokenContractId || "Not deployed"}
                </span>
              </div>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  View on Stellar Expert <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Escrow / Capital */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Escrow & Capital</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Escrowed</span>
                <span className="font-semibold text-zinc-900">${escrowedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Released</span>
                <span className="font-semibold text-emerald-600">${releasedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Remaining</span>
                <span className="font-semibold text-zinc-700">${(escrowedAmount - releasedAmount).toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: escrowedAmount > 0 ? `${(releasedAmount / escrowedAmount) * 100}%` : "0%" }}
                />
              </div>
            </div>
          </div>

          {/* Production signals */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Production Signals</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">IoT Devices</span>
                <span className="font-semibold text-zinc-900">{project._count?.iotDevices ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Production Records</span>
                <span className="font-semibold text-zinc-900">{project._count?.productionData ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Last Sync</span>
                <span className="font-semibold text-zinc-700">
                  {project.lastProductionUpdate
                    ? new Date(project.lastProductionUpdate).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Milestones */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total", value: milestoneStats.total, cls: "text-zinc-700" },
              { label: "Released", value: milestoneStats.released, cls: "text-purple-600" },
              { label: "Awaiting Review", value: milestoneStats.submitted, cls: "text-amber-600" },
              { label: "Pending", value: milestoneStats.pending, cls: "text-zinc-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
                <p className="text-xs font-medium text-zinc-400 mb-1">{s.label}</p>
                <p className={cn("text-2xl font-bold", s.cls)}>{s.value}</p>
              </div>
            ))}
          </div>

          {milestones.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl py-16 text-center">
              <BarChart3 className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium">No milestones configured</p>
              <p className="text-sm text-zinc-400 mt-1">
                {project.fundingModel === "FULL_UPFRONT"
                  ? "This is a Full Upfront project — no milestone releases."
                  : "Milestones will appear here once created."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m, i) => {
                const mbadge = MILESTONE_STATUS_BADGE[m.status] ?? { label: m.status, cls: "bg-zinc-100 text-zinc-500" };
                const isSubmitted = m.status === "SUBMITTED";
                const isMilestoneProcessing = processingAction === `milestone-${m.id}`;

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-2xl border bg-white p-5 transition-all",
                      isSubmitted ? "border-amber-200 shadow-sm shadow-amber-50" : "border-zinc-200",
                    )}
                  >
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Step number */}
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                          m.status === "RELEASED" ? "bg-purple-100 text-purple-700" :
                            isSubmitted ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500",
                        )}>
                          {i + 1}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-zinc-900">{m.name}</h3>
                            <span className={cn("inline-flex text-[10px] font-bold uppercase rounded-full px-2 py-0.5", mbadge.cls)}>
                              {mbadge.label}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500">{m.description}</p>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 pt-1">
                            <span className="font-medium text-zinc-600">
                              ${Number(m.releaseAmount).toLocaleString()} ({m.releasePercentage}%)
                            </span>
                            <span>·</span>
                            <span>Verify via: {m.verificationMethod}</span>
                            {m.submittedAt && (
                              <>
                                <span>·</span>
                                <span>Submitted {new Date(m.submittedAt).toLocaleDateString()}</span>
                              </>
                            )}
                            {m.verifiedAt && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-600">Verified {new Date(m.verifiedAt).toLocaleDateString()}</span>
                              </>
                            )}
                            {m.releasedAt && (
                              <>
                                <span>·</span>
                                <span className="text-purple-600">Released {new Date(m.releasedAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons for submitted milestones */}
                      {isSubmitted && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleVerifyMilestone(m.id)}
                            disabled={!!processingAction}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
                          >
                            {isMilestoneProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Verify & Release
                          </button>
                          <button
                            onClick={() => handleRejectMilestone(m.id)}
                            disabled={!!processingAction}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Devices */}
      {activeTab === "devices" && (
        <div className="space-y-4">
          {(project.iotDevices?.length ?? 0) === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl py-16 text-center">
              <Building2 className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium">No IoT devices registered</p>
              <p className="text-sm text-zinc-400 mt-1">The installer must register at least one device before activation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.iotDevices!.map((device) => (
                <div key={device.id} className="bg-white border border-zinc-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex text-[10px] font-bold uppercase rounded-full px-2 py-0.5",
                          device.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500",
                        )}>
                          {device.status}
                        </span>
                        <span className="text-xs text-zinc-400">Added {new Date(device.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="font-mono text-sm text-zinc-700 break-all">{device.publicKey}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
