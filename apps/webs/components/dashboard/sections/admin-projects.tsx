"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, adminApi, type Project } from "@/lib/api";
import { toast } from "sonner";

export function AdminProjectsSection() {
  const [activeTab, setActiveTab] = useState<
    "projects" | "activation" | "milestones"
  >("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  useEffect(() => {
    setProjects([]);
    setMilestones([]);
    if (activeTab === "projects") {
      fetchPendingProjects();
    } else if (activeTab === "activation") {
      fetchFundedProjects();
    } else {
      fetchSubmittedMilestones();
    }
  }, [activeTab]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminApi.approveProject(id);
      if (response.success) {
        toast.success("Project approved and token contract deployed!");
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error(response.error || "Failed to approve project");
      }
    } catch (err) {
      toast.error("An error occurred during approval");
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
        setProjects((prev) => prev.filter((p) => p.id !== id));
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
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  /* Existing handleApprove ... */

  const handleActivate = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminApi.activateProject(id);
      if (response.success) {
        toast.success("Project activated and capital released!");
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error(response.error || "Failed to activate project");
      }
    } catch (err) {
      toast.error("An error occurred during activation");
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
            Review submissions and activate funded projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-zinc-100 p-1 rounded-xl flex">
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
          </div>
          {/* Search bar ... */}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
          <p className="text-zinc-500">Loading projects...</p>
        </div>
      ) : activeTab === "projects" ? (
        /* Render PENDING Projects */
        filteredProjects.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 text-center">
            <Building2 className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">
              No pending projects
            </h3>
            <p className="text-zinc-500 max-w-[280px] mx-auto">
              All solar project submissions have been reviewed.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
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
            <h3 className="text-lg font-semibold text-foreground">
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
      ) : (
        /* Render Milestones */
        /* ... existing milestone rendering ... */
        <MilestoneList
          milestones={milestones}
          onVerify={handleVerifyMilestone}
          onReject={handleRejectMilestone}
          processingId={processingId}
        />
      )}
    </div>
  );
}

// Sub-components for cleaner rendering
function ProjectCard({
  project,
  onApprove,
  onReject,
  onActivate,
  processingId,
  type,
}: any) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-md transition-all group">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider",
                    type === "PENDING"
                      ? "bg-purple-50 text-purple-700"
                      : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  {type === "PENDING" ? "PENDING REVIEW" : "READY TO ACTIVATE"}
                </span>
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Submitted{" "}
                  {project.createdAt
                    ? new Date(project.createdAt).toLocaleDateString()
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
          {type === "PENDING" ? (
            <>
              <button
                onClick={() => onApprove(project.id)}
                disabled={!!processingId}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId === project.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve Project
              </button>
              <button
                onClick={() => onReject(project.id)}
                disabled={!!processingId}
                className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          ) : (
            <>
              {project._count?.iotDevices > 0 ? (
                <button
                  onClick={() => onActivate(project.id)}
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
        <h3 className="text-lg font-semibold text-foreground">
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
