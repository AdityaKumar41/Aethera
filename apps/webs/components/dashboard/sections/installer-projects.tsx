"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MapPin,
  Zap,
  DollarSign,
  MoreVertical,
  Loader2,
  Eye,
} from "lucide-react";

import { useInstallerProjects } from "@/hooks/use-dashboard-data";
import type { Project } from "@/lib/api";
import { ProjectDetailsSection } from "./project-details";

const statusConfig = {
  DRAFT: { label: "Draft", color: "bg-zinc-500", icon: Clock },
  PENDING_APPROVAL: { label: "Pending Review", color: "bg-amber-500", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-blue-500", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-500", icon: XCircle },
  FUNDING: { label: "Funding", color: "bg-purple-500", icon: DollarSign },
  FUNDED: { label: "Funded", color: "bg-emerald-500", icon: CheckCircle2 },
  ACTIVE: { label: "Active", color: "bg-green-500", icon: Zap },
  COMPLETED: { label: "Completed", color: "bg-zinc-600", icon: CheckCircle2 },
};

export function InstallerProjectsSection() {
  const { projects, loading, error } = useInstallerProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === "ACTIVE").length,
    funding: projects.filter(p => p.status === "FUNDING").length,
    pending: projects.filter(p => p.status === "PENDING_APPROVAL").length,
  };

  const totalFunding = projects.reduce((sum, p) => sum + Number(p.fundingRaised), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h4 className="font-semibold mb-2">Failed to load projects</h4>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (selectedProjectId) {
    return (
      <ProjectDetailsSection 
        projectId={selectedProjectId} 
        onBack={() => setSelectedProjectId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Total Projects</span>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Active</span>
          </div>
          <p className="text-3xl font-bold">{stats.active}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Funding</span>
          </div>
          <p className="text-3xl font-bold">{stats.funding}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Total Raised</span>
          </div>
          <p className="text-3xl font-bold">${(totalFunding / 1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Projects list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Your Projects</h3>
          <a
            href="?section=new-project"
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Project
          </a>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-semibold mb-2">No projects yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Submit your first solar project to start receiving funding.
            </p>
            <a
              href="?section=new-project"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Submit Project
            </a>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((project: Project) => {
              const statusInfo = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.DRAFT;
              const StatusIcon = statusInfo.icon;
              const fundingProgress = (Number(project.fundingRaised) / Number(project.fundingTarget)) * 100;

              return (
                <div key={project.id} className="p-5 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{project.name}</h4>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white",
                          statusInfo.color
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {project.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {project.capacity} kW
                        </span>
                        <span>{project.expectedYield}% APY</span>
                      </div>

                      {/* Funding progress */}
                      {(project.status === "FUNDING" || project.status === "FUNDED" || project.status === "ACTIVE") && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Funding progress</span>
                            <span className="font-medium">
                              ${Number(project.fundingRaised).toLocaleString()} / ${Number(project.fundingTarget).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedProjectId(project.id)}
                        className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

