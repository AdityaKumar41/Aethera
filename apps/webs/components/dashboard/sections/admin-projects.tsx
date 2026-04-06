"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Search,
  Filter,
  MapPin,
  BarChart3,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Zap,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, adminApi, type Project } from "@/lib/api";
import { toast } from "sonner";

export function AdminProjectsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "overview" | "projects" | "activation" | "milestones" | "yield"
  >("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAllProjects = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getAllProjects();
      if (response.success) {
        setProjects(response.data || []);
      } else {
        toast.error(response.error || "Failed to fetch all projects");
      }
    } catch (err) {
      toast.error("Failed to fetch all projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProjects = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getPendingProjects();
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      toast.error("Failed to fetch pending projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchFundedProjects = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getFundedProjects();
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      toast.error("Failed to fetch funded projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmittedMilestones = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getSubmittedMilestones();
      if (response.success) {
        setMilestones(response.data || []);
      }
    } catch (err) {
      toast.error("Failed to fetch submitted milestones");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveProjects = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getActiveProjects();
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      toast.error("Failed to fetch active projects");
    } finally {
      setLoading(false);
    }
  };

  const refreshProjectsView = async () => {
    if (activeTab === "overview") {
      await fetchAllProjects();
      return;
    }

    if (activeTab === "projects") {
      await fetchPendingProjects();
      return;
    }

    if (activeTab === "activation") {
      await fetchFundedProjects();
      return;
    }

    if (activeTab === "yield") {
      await fetchActiveProjects();
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const statusParam = searchParams.get("status");
    const validTabs = new Set([
      "overview",
      "projects",
      "activation",
      "milestones",
      "yield",
    ]);

    if (tabParam && validTabs.has(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }

    if (statusParam) {
      setStatusFilter(statusParam.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    setProjects([]);
    setMilestones([]);
    if (!searchParams.get("status")) {
      setStatusFilter("ALL");
    }
    if (activeTab === "overview") {
      fetchAllProjects();
    } else if (activeTab === "projects") {
      fetchPendingProjects();
    } else if (activeTab === "activation") {
      fetchFundedProjects();
    } else if (activeTab === "yield") {
      fetchActiveProjects();
    } else {
      fetchSubmittedMilestones();
    }
  }, [activeTab, searchParams]);

  const handleApprove = async (project: Project) => {
    setProcessingId(project.id);
    try {
      if (project.status === "PENDING_APPROVAL") {
        const response = await adminApi.approveProject(project.id);
        if (!response.success) {
          toast.error(response.error || "Failed to approve project");
          return;
        }
      }

      const deployResponse = await adminApi.deployToken(project.id);
      if (!deployResponse.success) {
        toast.warning(
          "Token deployment failed: " +
            (deployResponse.error || "Unknown error") +
            ". The project will stay in this list until deployment succeeds.",
        );
        await refreshProjectsView();
        return;
      }

      toast.success(
        project.status === "PENDING_APPROVAL"
          ? "Project approved and token contract deployed!"
          : "Token contract deployed successfully!",
      );
      await refreshProjectsView();
    } catch (err) {
      toast.error("An error occurred during token deployment");
      await refreshProjectsView();
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyMilestone = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminApi.verifyMilestone(id);
      if (response.success) {
        toast.success("Milestone verified and funds released!");
        setMilestones((prev) => prev.filter((m) => m.id !== id));
      } else {
        toast.error(response.error || "Failed to verify milestone");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectMilestone = async (id: string) => {
    const reason = window.prompt("Reason for rejecting this milestone:");
    if (!reason) return;

    setProcessingId(id);
    try {
      const response = await adminApi.rejectMilestone(id, reason);
      if (response.success) {
        toast.success("Milestone rejected");
        setMilestones((prev) => prev.filter((m) => m.id !== id));
      } else {
        toast.error(response.error || "Failed to reject milestone");
      }
    } catch (err) {
      toast.error("An error occurred while rejecting milestone");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;

    setProcessingId(id);
    try {
      const response = await adminApi.rejectProject(id, reason);
      if (response.success) {
        toast.success("Project rejected");
        await refreshProjectsView();
      } else {
        toast.error(response.error || "Failed to reject project");
      }
    } catch (err) {
      toast.error("An error occurred during rejection");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      (statusFilter === "ALL" || p.status === statusFilter) &&
      (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.installer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.installer?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tokenSymbol?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
  );

  const projectStats = {
    total: projects.length,
    pendingReview: projects.filter((p) => p.status === "PENDING_APPROVAL")
      .length,
    readyToDeploy: projects.filter(
      (p) => p.status === "APPROVED" && !p.tokenContractId,
    ).length,
    fundingLive: projects.filter((p) => p.status === "FUNDING").length,
    active: projects.filter((p) =>
      ["FUNDED", "ACTIVE_PENDING_DATA", "ACTIVE", "COMPLETED"].includes(
        p.status,
      ),
    ).length,
  };

  /* Existing handleApprove ... */

  const handleActivate = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminApi.activateProject(id);
      if (response.success) {
        toast.success("Project activated and capital released!");
        await refreshProjectsView();
      } else {
        toast.error(response.error || "Failed to activate project");
      }
    } catch (err) {
      toast.error("An error occurred during activation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDistributeYield = async (projectId: string) => {
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);

    setProcessingId(projectId);
    try {
      const response = await adminApi.distributeYield({
        projectId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        revenuePerKwh: 0.12,
        platformFeePercent: 10,
      });
      if (response.success) {
        toast.success(response.message || "Yield distributed successfully!");
      } else {
        toast.error(response.error || "Yield distribution failed");
      }
    } catch (err) {
      toast.error("An error occurred during yield distribution");
    } finally {
      setProcessingId(null);
    }
  };

  /* Existing handleReject ... */
  /* Existing filteredProjects ... */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Project Management
          </h2>
          <p className="text-zinc-500">
            Browse every project, filter by lifecycle, and open each one for the full approval and funding workflow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-zinc-100 p-1 rounded-xl flex">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "overview"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              All Projects
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "projects"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              Pending Approval
            </button>
            <button
              onClick={() => setActiveTab("activation")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "activation"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              Ready to Activate
            </button>
            <button
              onClick={() => setActiveTab("milestones")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "milestones"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              Milestones
            </button>
            <button
              onClick={() => setActiveTab("yield")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === "yield"
                  ? "bg-white text-amber-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              Yield
            </button>
          </div>
          <div className="relative hidden lg:block">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mr-2 h-11 rounded-xl border border-zinc-200 bg-white pl-10 pr-9 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="FUNDING">Funding</option>
              <option value="FUNDED">Funded</option>
              <option value="ACTIVE_PENDING_DATA">Active Pending Data</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, location, status, ticker..."
              className="h-11 w-80 rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
            />
          </div>
        </div>
      </div>

      <div className="relative lg:hidden">
        <div className="mb-3 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="FUNDING">Funding</option>
            <option value="FUNDED">Funded</option>
            <option value="ACTIVE_PENDING_DATA">Active Pending Data</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search name, location, status, ticker..."
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
          <p className="text-zinc-500">Loading projects...</p>
        </div>
      ) : activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              {
                label: "Total",
                value: projectStats.total,
                tone: "bg-zinc-50 text-zinc-700",
              },
              {
                label: "Under Review",
                value: projectStats.pendingReview,
                tone: "bg-amber-50 text-amber-700",
              },
              {
                label: "Ready to Deploy",
                value: projectStats.readyToDeploy,
                tone: "bg-blue-50 text-blue-700",
              },
              {
                label: "Funding Live",
                value: projectStats.fundingLive,
                tone: "bg-emerald-50 text-emerald-700",
              },
              {
                label: "Funded or Active",
                value: projectStats.active,
                tone: "bg-purple-50 text-purple-700",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <p className="text-xs font-medium text-zinc-500 mb-2">
                  {card.label}
                </p>
                <div
                  className={cn(
                    "inline-flex rounded-xl px-3 py-1 text-2xl font-bold",
                    card.tone,
                  )}
                >
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl py-20 text-center">
              <Building2 className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900">
                No projects match your search
              </h3>
              <p className="text-zinc-500 max-w-[320px] mx-auto">
                Try another name, location, status, installer, or token ticker.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredProjects.map((project) => (
                <AdminProjectOverviewCard
                  key={project.id}
                  project={project}
                  processingId={processingId}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onActivate={handleActivate}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "projects" ? (
        /* Render PENDING Projects */
        filteredProjects.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 text-center">
            <Building2 className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900">
              No pending projects
            </h3>
            <p className="text-zinc-500 max-w-[280px] mx-auto">
              All solar project submissions have been reviewed.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onApprove={handleApprove}
                onReject={handleReject}
                processingId={processingId}
                type="PENDING"
              />
            ))}
          </div>
        )
      ) : activeTab === "activation" ? (
        /* Render ACTIVATION Projects */
        filteredProjects.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 text-center">
            <Zap className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900">
              No projects ready for activation
            </h3>
            <p className="text-zinc-500 max-w-[280px] mx-auto">
              Projects will appear here once they are fully funded.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onActivate={handleActivate}
                processingId={processingId}
                type="FUNDED"
              />
            ))}
          </div>
        )
      ) : activeTab === "milestones" ? (
        /* Render Milestones */
        <MilestoneList
          milestones={milestones}
          onVerify={handleVerifyMilestone}
          onReject={handleRejectMilestone}
          processingId={processingId}
        />
      ) : (
        /* Render Yield Distribution */
        filteredProjects.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 text-center">
            <DollarSign className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900">
              No active projects
            </h3>
            <p className="text-zinc-500 max-w-[280px] mx-auto">
              Projects will appear here once they are active and generating
              energy.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-md transition-all"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider bg-emerald-50 text-emerald-700">
                        {project.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold">{project.name}</h3>
                    <p className="text-sm text-zinc-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {project.location}, {project.country}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      <div className="p-3 bg-zinc-50 rounded-xl">
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                          Capacity
                        </p>
                        <p className="text-sm font-bold">
                          {project.capacity} kW
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-50 rounded-xl">
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                          Investors
                        </p>
                        <p className="text-sm font-bold">
                          {(project as any)._count?.investments || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-50 rounded-xl">
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                          IoT Devices
                        </p>
                        <p className="text-sm font-bold">
                          {(project as any)._count?.iotDevices || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-50 rounded-xl">
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                          Funding Raised
                        </p>
                        <p className="text-sm font-bold text-emerald-600">
                          ${Number(project.fundingRaised).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-[220px] flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-zinc-200 pt-6 lg:pt-0 lg:pl-6">
                    <button
                      onClick={() => handleDistributeYield(project.id)}
                      disabled={!!processingId}
                      className="w-full py-3 px-4 bg-amber-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === project.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4" />
                      )}
                      Distribute Yield
                    </button>
                    <p className="text-[10px] text-zinc-500 text-center leading-tight">
                      Distributes yield for the last 30 days at $0.12/kWh with
                      10% platform fee.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// Sub-components for cleaner rendering
function getLifecycleMeta(project: Project) {
  if (project.status === "PENDING_APPROVAL") {
    return {
      badge: "Under Review",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      note: "Awaiting admin approval before any on-chain deployment starts.",
    };
  }

  if (project.status === "APPROVED" && !project.tokenContractId) {
    return {
      badge: "Ready to Deploy",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      note: "Approved in the database, but the Stellar token contract is not live yet.",
    };
  }

  if (project.status === "APPROVED" && project.tokenContractId) {
    return {
      badge: "Escrow Pending",
      badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
      note: "Token exists, but escrow or final funding initialization still needs to finish.",
    };
  }

  if (project.status === "FUNDING") {
    return {
      badge: "Funding Live",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      note: "Token and escrow are live. Investors can fund this project now.",
    };
  }

  if (project.status === "FUNDED") {
    return {
      badge: "Ready to Activate",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
      note: "Funding is complete. Activation waits on IoT readiness and release flow.",
    };
  }

  return {
    badge: project.status.replace(/_/g, " "),
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
    note: "Project is progressing through the operational lifecycle.",
  };
}

function AdminProjectOverviewCard({
  project,
  processingId,
  onApprove,
  onReject,
  onActivate,
}: {
  project: Project;
  processingId: string | null;
  onApprove: (project: Project) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const lifecycle = getLifecycleMeta(project);
  const canApproveOrDeploy =
    project.status === "PENDING_APPROVAL" || project.status === "APPROVED";
  const canReject = project.status === "PENDING_APPROVAL";
  const canActivate =
    project.status === "FUNDED" && (project._count?.iotDevices || 0) > 0;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                lifecycle.badgeClass,
              )}
            >
              {lifecycle.badge}
            </span>
            {project.tokenSymbol && (
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-mono text-zinc-700">
                {project.tokenSymbol}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-zinc-950">{project.name}</h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
              <MapPin className="w-4 h-4" />
              {project.location}, {project.country}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
            <span>
              Installer:{" "}
              <span className="font-medium text-zinc-900">
                {project.installer?.company ||
                  project.installer?.name ||
                  "Independent"}
              </span>
            </span>
            <span>
              Capacity:{" "}
              <span className="font-medium text-zinc-900">
                {project.capacity} kW
              </span>
            </span>
            <span>
              Target:{" "}
              <span className="font-medium text-zinc-900">
                ${Number(project.fundingTarget).toLocaleString()}
              </span>
            </span>
            <span>
              Created:{" "}
              <span className="font-medium text-zinc-900">
                {project.createdAt
                  ? new Date(project.createdAt).toLocaleDateString()
                  : "N/A"}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:w-[220px]">
          <button
            onClick={() => router.push(`/dashboard/admin-projects/${project.id}`)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-all"
          >
            Open Details
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs leading-relaxed text-zinc-500">
            Open the project to review documents, token state, milestones, device data, and the full admin workflow.
          </p>
        </div>
      </div>

      {project.rejectionReason && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Rejection reason: {project.rejectionReason}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
        {canApproveOrDeploy && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(project);
            }}
            disabled={processingId === project.id}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {processingId === project.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {project.status === "PENDING_APPROVAL"
              ? "Approve and Deploy"
              : project.tokenContractId
                ? "Finalize Funding Setup"
                : "Deploy Token"}
          </button>
        )}

        {canReject && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject(project.id);
            }}
            disabled={processingId === project.id}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Reject Project
          </button>
        )}

        {canActivate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActivate(project.id);
            }}
            disabled={processingId === project.id}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {processingId === project.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Activate Project
          </button>
        )}

        {!canApproveOrDeploy && !canActivate && (
          <p className="text-sm text-zinc-500">
            No quick action needed here. Use the detail page for the full project review.
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-zinc-900">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

function ProjectCard({
  project,
  onApprove,
  onReject,
  onActivate,
  processingId,
  type,
}: any) {
  const router = useRouter();
  const pendingDeployment =
    project.status === "APPROVED" && !project.tokenContractId;
  const pendingEscrow =
    project.status === "APPROVED" && Boolean(project.tokenContractId);
  const pendingReview = project.status === "PENDING_APPROVAL";

  return (
    <div 
      onClick={() => router.push(`/dashboard/admin-projects/${project.id}`)}
      className="bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-md transition-all group cursor-pointer"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider",
                    pendingReview
                      ? "bg-purple-50 text-purple-700"
                      : pendingDeployment
                        ? "bg-blue-50 text-blue-700"
                        : pendingEscrow
                          ? "bg-violet-50 text-violet-700"
                      : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  {pendingReview
                    ? "PENDING REVIEW"
                    : pendingDeployment
                      ? "READY TO DEPLOY"
                      : pendingEscrow
                        ? "ESCROW PENDING"
                      : "READY TO ACTIVATE"}
                </span>
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingDeployment || pendingEscrow ? "Approved" : "Submitted"}{" "}
                  {(
                    pendingDeployment || pendingEscrow
                      ? project.approvedAt
                      : project.createdAt
                  )
                    ? new Date(
                        pendingDeployment || pendingEscrow
                          ? project.approvedAt!
                          : project.createdAt!,
                      ).toLocaleDateString()
                    : "recently"}
                </span>
              </div>
              <h3 className="text-xl font-bold group-hover:text-purple-600 transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {project.location}, {project.country}
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">
            {project.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-zinc-50 rounded-xl">
              <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                Capacity
              </p>
              <p className="text-sm font-bold">{project.capacity} kW</p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl">
              <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                Funding Target
              </p>
              <p className="text-sm font-bold">
                ${Number(project.fundingTarget).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl">
              {type === "FUNDED" ? (
                <>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                    Raised
                  </p>
                  <p className="text-sm font-bold text-emerald-600">
                    ${Number(project.fundingRaised).toLocaleString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                    Exp. Yield
                  </p>
                  <p className="text-sm font-bold text-emerald-600">
                    {project.expectedYield}%
                  </p>
                </>
              )}
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl">
              <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">
                Installer
              </p>
              <p className="text-sm font-bold truncate">
                {project.installer?.company ||
                  project.installer?.name ||
                  "Independent"}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:w-[220px] flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-zinc-200 pt-6 lg:pt-0 lg:pl-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/admin-projects/${project.id}`);
            }}
            className="w-full py-3 px-4 bg-zinc-950 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
          >
            Open Details
            <ArrowRight className="w-4 h-4" />
          </button>

          {type === "PENDING" ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(project);
                }}
                disabled={!!processingId}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId === project.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {pendingReview
                  ? "Approve & Deploy"
                  : pendingDeployment
                    ? "Deploy Token"
                    : "Finalize Funding"}
              </button>
              {pendingReview ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(project.id);
                  }}
                  disabled={!!processingId}
                  className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              ) : (
                <p className="text-[10px] text-zinc-500 text-center leading-tight">
                  {pendingEscrow
                    ? "Token exists already. Use this action to retry escrow setup and move the project into live funding."
                    : "Approval is complete. This project is waiting for the Stellar token deployment to move into live funding."}
                </p>
              )}
            </>
          ) : (
            <>
              {project._count?.iotDevices > 0 ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivate(project.id);
                    }}
                    disabled={!!processingId}
                    className="w-full py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processingId === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Activate Project
                  </button>
                  {project.fundingModel === "MILESTONE_BASED" && (
                    <p className="text-[10px] text-blue-600 text-center leading-tight font-medium">
                      🎯 Milestone: Capital stays in escrow. Funds release per milestone as verified.
                    </p>
                  )}
                  {project.fundingModel !== "MILESTONE_BASED" && (
                    <p className="text-[10px] text-zinc-500 text-center leading-tight">
                      ⚡ Full Upfront: All capital released to installer on activation.
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-amber-100">
                    <AlertTriangle className="w-3 h-3" />
                    Waiting for IoT Device
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Installer must connect a device before funds can be
                    released.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MilestoneList({ milestones, onVerify, onReject, processingId }: any) {
  if (milestones.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl py-20 text-center">
        <Clock className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-zinc-900">
          No pending milestones
        </h3>
        <p className="text-zinc-500 max-w-[280px] mx-auto">
          All submitted milestone proofs have been reviewed.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      {milestones.map((milestone: any) => (
        <div
          key={milestone.id}
          className="bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-md transition-all group"
        >
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded-md tracking-wider">
                  MILESTONE SUBMITTED
                </span>
                <span className="text-xs text-zinc-500">
                  {milestone.project?.name}
                </span>
              </div>
              <h3 className="text-xl font-bold">{milestone.name}</h3>
              <p className="text-sm text-zinc-500">
                {milestone.description}
              </p>

              <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500">
                <span>
                  Release Amount: $
                  {Number(milestone.releaseAmount).toLocaleString()}
                </span>
                <span>Method: {milestone.verificationMethod}</span>
              </div>
            </div>

            <div className="lg:w-[220px] flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-zinc-200 pt-6 lg:pt-0 lg:pl-6">
              <button
                onClick={() => onVerify(milestone.id)}
                disabled={!!processingId}
                className="w-full py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId === milestone.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Verify & Release
              </button>
              <button
                onClick={() => onReject(milestone.id)}
                disabled={!!processingId}
                className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId === milestone.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
