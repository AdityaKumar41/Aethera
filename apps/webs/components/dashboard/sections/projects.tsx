"use client";

import { useState } from "react";
import { EnergyProductionChart } from "@/components/dashboard/charts/energy-production-chart";
import { cn } from "@/lib/utils";
import {
  Zap,
  Sun,
  TrendingUp,
  Battery,
  MoreVertical,
  Loader2,
  DollarSign,
} from "lucide-react";
import { useInvestments, usePortfolio } from "@/hooks/use-dashboard-data";
import { SellTokensModal } from "@/components/dashboard/sell-tokens-modal";
import { SecondaryMarket } from "@/components/dashboard/secondary-market";
import { Button } from "@/components/ui/button";

const statusConfig = {
  producing: {
    label: "Producing",
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
  },
  funding: {
    label: "Funding",
    color: "bg-amber-500",
    textColor: "text-amber-600",
  },
  funded: { label: "Funded", color: "bg-blue-500", textColor: "text-blue-600" },
  maintenance: {
    label: "Maintenance",
    color: "bg-orange-500",
    textColor: "text-orange-600",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
  },
  pending: {
    label: "Pending",
    color: "bg-amber-500",
    textColor: "text-amber-600",
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

  // Map investments to project format
  const myProjects: MappedProject[] = investments.map((inv) => ({
    id: inv.id,
    projectId: inv.project.id,
    name: inv.project.name,
    location: inv.project.location || "Unknown location",
    tokensOwned: inv.tokenAmount,
    tokenValue: inv.amount, // Current value same as purchase for now
    purchasePrice: inv.amount,
    pricePerToken: inv.amount / Math.max(inv.tokenAmount, 1), // Calculate from amount and token count
    cumulativeYield: 0, // Would come from yield history
    status: (inv.project.status?.toLowerCase() ||
      inv.status.toLowerCase()) as keyof typeof statusConfig,
    energyToday: 0,
    energyMonth: 0,
    lastYieldDate: null,
    lastYieldAmount: 0,
  }));

  const selectedProject =
    myProjects.find((p) => p.id === selectedProjectId) || myProjects[0] || null;

  const totalValue = portfolio?.totalInvested || 0;
  const totalYield = 0; // Would come from yield summary
  const producingProjects = myProjects.filter(
    (p) => p.status === "producing",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading projects...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-solar flex items-center justify-center">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">
              Total Projects
            </span>
          </div>
          <p className="text-3xl font-bold">{myProjects.length}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {producingProjects} actively producing
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-investment flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">
              Portfolio Value
            </span>
          </div>
          <p className="text-3xl font-bold">${totalValue.toLocaleString()}</p>
          <p className="text-sm text-emerald-600 mt-1">
            {totalValue > 0 ? "+0.0% all time" : "No investments yet"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-energy flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">
              Total Yield Earned
            </span>
          </div>
          <p className="text-3xl font-bold">${totalYield.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Lifetime earnings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Your Projects
          </h3>
          {myProjects.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Sun className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No projects yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Visit the Marketplace to invest in a solar project
              </p>
            </div>
          ) : (
            myProjects.map((project) => {
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
                      ? "bg-emerald-50 border-emerald-500"
                      : "bg-card border-border hover:border-emerald-300",
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {project.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {project.location}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        config.color,
                        "text-white",
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {project.tokensOwned} tokens
                    </span>
                    <span className="font-medium">
                      ${project.tokenValue.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Project details */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedProject ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <Battery className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-lg mb-2">No Projects</h4>
              <p className="text-sm text-muted-foreground mb-4">
                You don&apos;t have any solar projects yet. Visit the
                Marketplace to invest in a project.
              </p>
            </div>
          ) : (
            <>
              {/* Selected project header */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold">
                        {selectedProject.name}
                      </h3>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          statusConfig[selectedProject.status]?.color ||
                            "bg-gray-500",
                          "text-white",
                        )}
                      >
                        {statusConfig[selectedProject.status]?.label ||
                          selectedProject.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedProject.location}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowSellModal(true)}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Sell Tokens
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Tokens Owned
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedProject.tokensOwned}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Current Value
                    </p>
                    <p className="text-lg font-semibold">
                      ${selectedProject.tokenValue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Yield
                    </p>
                    <p className="text-lg font-semibold text-emerald-600">
                      ${selectedProject.cumulativeYield.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ROI</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {selectedProject.purchasePrice > 0
                        ? `+${(((selectedProject.tokenValue + selectedProject.cumulativeYield) / selectedProject.purchasePrice - 1) * 100).toFixed(1)}%`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary Market */}
              <SecondaryMarket
                key={refreshKey}
                projectId={selectedProject.projectId}
                projectName={selectedProject.name}
                currentPrice={selectedProject.pricePerToken}
              />

              {/* Energy production chart */}
              {selectedProject.status === "producing" && (
                <EnergyProductionChart projectName={selectedProject.name} />
              )}

              {(selectedProject.status === "funding" ||
                selectedProject.status === "pending") && (
                <div className="bg-card border border-border rounded-2xl p-6 text-center">
                  <Battery className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Project Still Funding</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    This project is still in the funding phase. Energy
                    production data will be available once the project is
                    operational.
                  </p>
                  <button className="px-4 py-2 bg-zinc-100 text-foreground rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                    View Project Details
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sell Tokens Modal */}
      {selectedProject && (
        <SellTokensModal
          isOpen={showSellModal}
          onClose={() => setShowSellModal(false)}
          projectId={selectedProject.projectId}
          projectName={selectedProject.name}
          availableTokens={selectedProject.tokensOwned}
          currentPrice={selectedProject.pricePerToken}
          onSuccess={() => {
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
