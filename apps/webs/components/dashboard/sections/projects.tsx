"use client";

import { useState } from "react";
import { EnergyProductionChart } from "@/components/dashboard/charts/energy-production-chart";
import { cn } from "@/lib/utils";
import {
  Zap,
  Sun,
  TrendingUp,
  Battery,
  Loader2,
  DollarSign,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { useInvestments, usePortfolio } from "@/hooks/use-dashboard-data";
import { SellTokensModal } from "@/components/dashboard/sell-tokens-modal";
import { SecondaryMarket } from "@/components/dashboard/secondary-market";

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  producing: {
    label: "Producing",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
  funding: { label: "Funding", color: "text-amber-700", bg: "bg-amber-100" },
  funded: { label: "Funded", color: "text-blue-700", bg: "bg-blue-100" },
  maintenance: {
    label: "Maintenance",
    color: "text-orange-700",
    bg: "bg-orange-100",
  },
  confirmed: {
    label: "Confirmed",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  pending_onchain: {
    label: "Processing",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
};

interface MappedProject {
  id: string;
  projectId: string;
  name: string;
  location: string;
  tokensOwned: number;
  tokenValue: number;
  purchasePrice: number;
  pricePerToken: number;
  cumulativeYield: number;
  status: keyof typeof statusConfig;
  energyToday: number;
  energyMonth: number;
  lastYieldDate: string | null;
  lastYieldAmount: number;
}

export function ProjectsSection() {
  const { investments, loading, error } = useInvestments();
  const { portfolio } = usePortfolio();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [showSellModal, setShowSellModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Group investments by project
  const projectGroups = investments.reduce((acc: Record<string, any>, inv) => {
    if (inv.status === "FAILED") return acc;
    const pid = inv.project.id;
    if (!acc[pid]) {
      acc[pid] = {
        id: inv.project.id,
        projectId: inv.project.id,
        name: inv.project.name,
        location: inv.project.location || "Unknown location",
        tokensOwned: 0,
        purchasePrice: 0,
        projectStatus: inv.project.status,
        investmentStatus: inv.status,
        currentPricePerToken: Number(inv.project.pricePerToken) || 100,
      };
    }
    acc[pid].tokensOwned += inv.tokenAmount;
    acc[pid].purchasePrice += Number(inv.amount);
    if (inv.status === "CONFIRMED") acc[pid].investmentStatus = "CONFIRMED";
    else if (
      inv.status === "PENDING_ONCHAIN" &&
      acc[pid].investmentStatus !== "CONFIRMED"
    ) {
      acc[pid].investmentStatus = "PENDING_ONCHAIN";
    }
    return acc;
  }, {});

  const myProjects: MappedProject[] = Object.values(projectGroups).map(
    (group: any) => ({
      id: group.id,
      projectId: group.projectId,
      name: group.name,
      location: group.location,
      tokensOwned: group.tokensOwned,
      tokenValue: group.tokensOwned * group.currentPricePerToken,
      purchasePrice: group.purchasePrice,
      pricePerToken: group.purchasePrice / Math.max(group.tokensOwned, 1),
      cumulativeYield: 0,
      status: (() => {
        const pStatus = group.projectStatus?.toLowerCase();
        const iStatus = group.investmentStatus.toLowerCase();
        if (pStatus === "active" || pStatus === "producing") return "producing";
        if (iStatus === "pending_onchain") return "pending_onchain";
        if (iStatus === "pending") return "pending";
        if (pStatus === "funded") return "funded";
        if (pStatus === "funding") return "funding";
        return "confirmed";
      })() as keyof typeof statusConfig,
      energyToday: 0,
      energyMonth: 0,
      lastYieldDate: null,
      lastYieldAmount: 0,
    }),
  );

  const selectedProject =
    myProjects.find((p) => p.id === selectedProjectId) || myProjects[0] || null;

  const totalValue = portfolio?.totalInvested || 0;
  const producingCount = myProjects.filter(
    (p) => p.status === "producing",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-500">Loading investments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-100 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Sun className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-zinc-500">Total Investments</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{myProjects.length}</p>
          <p className="text-xs text-zinc-400 mt-1">
            {producingCount} actively producing
          </p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm text-zinc-500">Portfolio Value</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">
            ${totalValue.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {totalValue > 0 ? "Total invested" : "No investments yet"}
          </p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-sm text-zinc-500">Total Yield Earned</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">$0.00</p>
          <p className="text-xs text-zinc-400 mt-1">Lifetime earnings</p>
        </div>
      </div>

      {myProjects.length === 0 ? (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center">
          <Battery className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
          <h4 className="font-semibold text-zinc-900 mb-2">No investments yet</h4>
          <p className="text-sm text-zinc-500 mb-5">
            Visit the Marketplace to invest in a solar project and start earning
            yield.
          </p>
          <a
            href="/dashboard/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Browse Marketplace <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project list */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-sm font-medium text-zinc-500 mb-3">
              Your Projects
            </h3>
            {myProjects.map((project) => {
              const config =
                statusConfig[project.status] || statusConfig.confirmed;
              const isSelected = selectedProject?.id === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all duration-200",
                    isSelected
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <h4 className="font-medium text-zinc-900 text-sm truncate">
                        {project.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium",
                        config.bg,
                        config.color,
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-zinc-400 text-xs">
                      {project.tokensOwned} tokens
                    </span>
                    <span className="font-semibold text-zinc-900 text-sm">
                      ${project.tokenValue.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Project detail */}
          <div className="lg:col-span-2 space-y-5">
            {selectedProject && (
              <>
                {/* Header card */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {selectedProject.name}
                        </h3>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-medium",
                            statusConfig[selectedProject.status]?.bg || "bg-zinc-100",
                            statusConfig[selectedProject.status]?.color || "text-zinc-600",
                          )}
                        >
                          {statusConfig[selectedProject.status]?.label ||
                            selectedProject.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-zinc-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedProject.location}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSellModal(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      <DollarSign className="w-4 h-4" />
                      Sell Tokens
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Tokens Owned",
                        value: selectedProject.tokensOwned,
                      },
                      {
                        label: "Current Value",
                        value: `$${selectedProject.tokenValue.toLocaleString()}`,
                      },
                      {
                        label: "Total Yield",
                        value: `$${selectedProject.cumulativeYield.toFixed(2)}`,
                        emerald: true,
                      },
                      {
                        label: "ROI",
                        value:
                          selectedProject.purchasePrice > 0
                            ? `+${(((selectedProject.tokenValue + selectedProject.cumulativeYield) / selectedProject.purchasePrice - 1) * 100).toFixed(1)}%`
                            : "N/A",
                        emerald: true,
                      },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <p className="text-xs text-zinc-400 mb-1">
                          {stat.label}
                        </p>
                        <p
                          className={cn(
                            "text-lg font-semibold",
                            stat.emerald ? "text-emerald-600" : "text-zinc-900",
                          )}
                        >
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <SecondaryMarket
                  key={refreshKey}
                  projectId={selectedProject.projectId}
                  projectName={selectedProject.name}
                  currentPrice={selectedProject.pricePerToken}
                />

                {selectedProject.status === "producing" && (
                  <EnergyProductionChart />
                )}

                {(selectedProject.status === "funding" ||
                  selectedProject.status === "pending") && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                    <Battery className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                    <h4 className="font-medium text-zinc-900 mb-1">
                      Project in Funding Phase
                    </h4>
                    <p className="text-sm text-zinc-500">
                      Energy production data will be available once the project
                      is fully funded and operational.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {selectedProject && (
        <SellTokensModal
          isOpen={showSellModal}
          onClose={() => setShowSellModal(false)}
          projectId={selectedProject.projectId}
          projectName={selectedProject.name}
          availableTokens={selectedProject.tokensOwned}
          currentPrice={selectedProject.pricePerToken}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
}
