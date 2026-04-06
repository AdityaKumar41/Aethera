"use client";

import { useRouter } from "next/navigation";
import {
  Users,
  DollarSign,
  Loader2,
  FolderOpen,
  ShieldCheck,
  ArrowRight,
  Activity,
  Clock3,
  SunMedium,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminStats } from "@/hooks/use-dashboard-data";

export function AdminStatsSection() {
  const router = useRouter();
  const { stats: apiStats, loading, error } = useAdminStats();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-500 font-medium">
          Loading platform metrics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-3xl p-8 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Admin Overview</h2>
        <p className="text-zinc-500 text-sm mt-1">
          One place to monitor queues, funding health, and the items that need admin action next.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          {
            label: "Funding Raised",
            value: formatCompactCurrency(apiStats?.funding.totalRaised || 0),
            helper: `${apiStats?.projects.funding || 0} live funding projects`,
            icon: DollarSign,
            tone: "from-emerald-500 to-teal-600",
          },
          {
            label: "Projects on Platform",
            value: String(apiStats?.projects.total || 0),
            helper: `${apiStats?.queues.underReview || 0} under review`,
            icon: FolderOpen,
            tone: "from-amber-500 to-orange-500",
          },
          {
            label: "Users",
            value: String(apiStats?.users.total || 0),
            helper: `${apiStats?.users.installers || 0} installers, ${apiStats?.users.investors || 0} investors`,
            icon: Users,
            tone: "from-blue-500 to-indigo-600",
          },
          {
            label: "Pending KYC",
            value: String(apiStats?.kyc.pendingReview || 0),
            helper:
              (apiStats?.kyc.pendingReview || 0) > 0
                ? "Review queue needs attention"
                : "No verification backlog",
            icon: ShieldCheck,
            tone: "from-violet-500 to-purple-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border border-zinc-200 rounded-3xl p-6 group hover:border-zinc-300 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                    stat.tone,
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <Activity className="w-4 h-4 text-zinc-300" />
              </div>
              <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
              <h4 className="text-3xl font-black text-zinc-900 mt-1">
                {stat.value}
              </h4>
              <p className="mt-2 text-xs text-zinc-500">{stat.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white border border-zinc-200 rounded-3xl p-8">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Operational Queues</h3>
            <p className="text-sm text-zinc-500">
              Real admin queues across approvals, live funding, activation, and operations.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <QueueCard
              label="Under Review"
              count={apiStats?.queues.underReview || 0}
              note="New project submissions waiting for approval."
              onClick={() => router.push("/dashboard/admin-projects?tab=projects&status=PENDING_APPROVAL")}
            />
            <QueueCard
              label="Approved, Not Finalized"
              count={apiStats?.queues.approvedAwaitingDeployment || 0}
              note="Approved projects still waiting for token deployment or funding setup."
              onClick={() => router.push("/dashboard/admin-projects?tab=projects&status=APPROVED")}
            />
            <QueueCard
              label="Funding Live"
              count={apiStats?.queues.fundingLive || 0}
              note="Projects currently open for investors on Stellar."
              onClick={() => router.push("/dashboard/admin-projects?tab=overview&status=FUNDING")}
            />
            <QueueCard
              label="Ready to Activate"
              count={apiStats?.queues.readyToActivate || 0}
              note="Fully funded projects waiting on activation and device readiness."
              onClick={() => router.push("/dashboard/admin-projects?tab=activation")}
            />
            <QueueCard
              label="Active Operations"
              count={apiStats?.queues.activeOperations || 0}
              note="Projects already activated or producing data."
              onClick={() => router.push("/dashboard/admin-projects?tab=yield")}
            />
            <QueueCard
              label="KYC Reviews"
              count={apiStats?.kyc.pendingReview || 0}
              note="Users waiting for identity and compliance approval."
              onClick={() => router.push("/dashboard/admin-kyc")}
            />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-zinc-900">Recent KYC Queue</h3>
              <p className="text-sm text-zinc-500">
                The most recent users currently waiting for review.
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/admin-kyc")}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Open Queue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {apiStats?.recentKycSubmissions?.length ? (
              apiStats.recentKycSubmissions.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">
                      {user.name || "Unnamed user"}
                    </p>
                    <p className="truncate text-sm text-zinc-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {user.role}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {user.kycSubmittedAt
                        ? new Date(user.kycSubmittedAt).toLocaleDateString()
                        : "Pending"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center">
                <Clock3 className="mx-auto mb-3 h-5 w-5 text-zinc-400" />
                <p className="text-sm text-zinc-500">No KYC items waiting right now.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Recent Project Activity</h3>
            <p className="text-sm text-zinc-500">
              Latest updated projects across the whole platform.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/admin-projects")}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Open Projects
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {apiStats?.recentProjects?.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/dashboard/admin-projects/${project.id}`)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 px-4 py-4 text-left transition-colors hover:bg-zinc-50"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-900">{project.name}</p>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                    {formatProjectStatus(project.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {project.location}, {project.country}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-zinc-900">
                  {project.installer?.company || project.installer?.name || "Independent"}
                </p>
                <p className="text-xs text-zinc-400">
                  Updated{" "}
                  {project.updatedAt
                    ? new Date(project.updatedAt).toLocaleDateString()
                    : "recently"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QueueCard({
  label,
  count,
  note,
  onClick,
}: {
  label: string;
  count: number;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-left transition-colors hover:bg-white hover:border-zinc-300"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        <ArrowRight className="h-4 w-4 text-zinc-400" />
      </div>
      <p className="mt-3 text-3xl font-black text-zinc-950">{count}</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{note}</p>
    </button>
  );
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }

  return `$${value.toLocaleString()}`;
}

function formatProjectStatus(status: string) {
  return status.replace(/_/g, " ");
}
