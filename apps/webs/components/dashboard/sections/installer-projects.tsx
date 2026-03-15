"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
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
  Loader2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useInstallerProjects } from "@/hooks/use-dashboard-data";
import type { Project } from "@/lib/api";

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  DRAFT: {
    label: "Draft",
    color: "text-zinc-600",
    bg: "bg-zinc-100",
    icon: Clock,
  },
  PENDING_APPROVAL: {
    label: "Under Review",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: XCircle,
  },
  FUNDING: {
    label: "Funding",
    color: "text-purple-700",
    bg: "bg-purple-100",
    icon: DollarSign,
  },
  FUNDED: {
    label: "Funded",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    icon: CheckCircle2,
  },
  ACTIVE_PENDING_DATA: {
    label: "Awaiting IoT",
    color: "text-orange-700",
    bg: "bg-orange-100",
    icon: AlertCircle,
  },
  ACTIVE: {
    label: "Active",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: Zap,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-zinc-600",
    bg: "bg-zinc-100",
    icon: CheckCircle2,
  },
};

export function InstallerProjectsSection() {
  const { projects, loading, error } = useInstallerProjects();

  const stats = {
    total: projects.length,
    active: projects.filter(
      (p) => p.status === "ACTIVE" || p.status === "ACTIVE_PENDING_DATA",
    ).length,
    funding: projects.filter((p) => p.status === "FUNDING").length,
    pending: projects.filter((p) => p.status === "PENDING_APPROVAL").length,
    totalRaised: projects.reduce((sum, p) => sum + Number(p.fundingRaised), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-500">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-zinc-600">Failed to load projects.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Projects",
            value: stats.total,
            icon: Building2,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Active",
            value: stats.active,
            icon: Zap,
            color: "bg-green-50 text-green-600",
          },
          {
            label: "Funding",
            value: stats.funding,
            icon: TrendingUp,
            color: "bg-purple-50 text-purple-600",
          },
          {
            label: "Total Raised",
            value: `$${stats.totalRaised >= 1000 ? (stats.totalRaised / 1000).toFixed(0) + "K" : stats.totalRaised}`,
            icon: DollarSign,
            color: "bg-emerald-50 text-emerald-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-zinc-100 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  stat.color,
                )}
              >
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-sm text-zinc-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Projects list */}
      <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900">Your Projects</h3>
          <a
            href="/dashboard/new-project"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </a>
        </div>

        {projects.length === 0 ? (
          <div className="p-16 text-center">
            <Building2 className="w-10 h-10 text-zinc-200 mx-auto mb-4" />
            <h4 className="font-semibold text-zinc-900 mb-2">
              No projects yet
            </h4>
            <p className="text-sm text-zinc-500 mb-5">
              Submit your first solar project to start receiving funding from
              investors.
            </p>
            <a
              href="/dashboard/new-project"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Submit Project
            </a>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {projects.map((project: Project) => {
              const statusInfo =
                statusConfig[project.status as keyof typeof statusConfig] ||
                statusConfig.DRAFT;
              const StatusIcon = statusInfo.icon;
              const fundingProgress =
                Number(project.fundingTarget) > 0
                  ? (Number(project.fundingRaised) /
                      Number(project.fundingTarget)) *
                    100
                  : 0;
              const showFundingBar = [
                "FUNDING",
                "FUNDED",
                "ACTIVE_PENDING_DATA",
                "ACTIVE",
              ].includes(project.status);

              return (
                <div
                  key={project.id}
                  className="px-5 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <h4 className="font-semibold text-zinc-900 text-sm">
                          {project.name}
                        </h4>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            statusInfo.bg,
                            statusInfo.color,
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                          {project.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-zinc-400" />
                          {project.capacity} kW
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                          {project.expectedYield}% APY
                        </span>
                      </div>

                      {showFundingBar && (
                        <div>
                          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                            <span>
                              ${Number(project.fundingRaised).toLocaleString()}{" "}
                              raised
                            </span>
                            <span>
                              of $
                              {Number(project.fundingTarget).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                fundingProgress >= 100
                                  ? "bg-emerald-500"
                                  : "bg-blue-500",
                              )}
                              style={{
                                width: `${Math.min(fundingProgress, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/dashboard/my-projects/${project.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-sm text-zinc-600 font-medium transition-colors flex-shrink-0"
                    >
                      Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
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
