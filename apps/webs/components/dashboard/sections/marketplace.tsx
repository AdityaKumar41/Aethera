"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { InvestModal } from "@/components/dashboard/invest-modal";
import { ProjectDetailsModal } from "@/components/dashboard/project-details-modal";
import {
  Search,
  Sun,
  Loader2,
  AlertCircle,
  TrendingUp,
  Zap,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketplace } from "@/hooks/use-dashboard-data";
import type { Project } from "@/lib/api";

type FilterStatus = "all" | "funding" | "funded" | "producing";

export function MarketplaceSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const {
    projects: rawProjects,
    loading,
    error,
    refetch,
  } = useMarketplace(1, 20, filterStatus);
  const projects = rawProjects || [];

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);

  const handleViewDetails = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsDetailsModalOpen(true);
    }
  };

  const handleInvestClick = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsDetailsModalOpen(false);
      setIsInvestModalOpen(true);
    }
  };

  const handleInvestSuccess = () => {
    refetch();
    setIsInvestModalOpen(false);
    setSelectedProject(null);
  };

  const mappedProjects = projects.map((project) => ({
    id: project.id,
    name: project.name,
    location: project.location,
    capacity: `${project.capacity} kW`,
    fundingProgress: project.fundingPercentage || 0,
    fundingGoal: Number(project.fundingTarget) || 0,
    currentFunding: Number(project.fundingRaised) || 0,
    expectedYield: project.expectedYield,
    tokenPrice: Number(project.pricePerToken) || 0,
    status:
      project.status === "ACTIVE" || project.status === "ACTIVE_PENDING_DATA"
        ? ("producing" as const)
        : (project.status.toLowerCase() as any),
    image: "/hero-solar.png",
  }));

  const filteredProjects = mappedProjects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Real computed stats
  const totalRaised = projects.reduce(
    (sum, p) => sum + Number(p.fundingRaised || 0),
    0,
  );
  const fundingCount = projects.filter((p) => p.status === "FUNDING").length;
  const activeCount = projects.filter(
    (p) => p.status === "ACTIVE" || p.status === "ACTIVE_PENDING_DATA",
  ).length;

  const statCards = [
    {
      label: "Total Projects",
      value: projects.length,
      sub: "on platform",
      icon: BarChart3,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Open to Invest",
      value: fundingCount,
      sub: "currently funding",
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Producing",
      value: activeCount,
      sub: "generating yield",
      icon: Zap,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Total Raised",
      value: `$${totalRaised >= 1000 ? (totalRaised / 1000).toFixed(0) + "K" : totalRaised.toFixed(0)}`,
      sub: "funded so far",
      icon: DollarSign,
      color: "bg-violet-50 text-violet-600",
    },
  ];

  const statusFilters: { label: string; value: FilterStatus }[] = [
    { label: "All Projects", value: "all" },
    { label: "Funding Now", value: "funding" },
    { label: "Funded", value: "funded" },
    { label: "Producing", value: "producing" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
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
            <p className="text-xs text-zinc-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by project name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-zinc-400"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 flex-shrink-0 overflow-x-auto">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                filterStatus === filter.value
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="text-sm text-zinc-500">
          {filteredProjects.length === 0
            ? "No projects match your search"
            : `${filteredProjects.length} project${filteredProjects.length !== 1 ? "s" : ""} found`}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm text-zinc-500">Loading projects...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-zinc-600">
            Failed to load projects.{" "}
            <button
              onClick={refetch}
              className="text-emerald-600 underline font-medium"
            >
              Try again
            </button>
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <>
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 rounded-2xl border border-zinc-100 border-dashed">
              <Sun className="w-10 h-10 text-zinc-300 mb-4" />
              <p className="font-semibold text-zinc-700 mb-1">
                No projects found
              </p>
              <p className="text-sm text-zinc-400 mb-5">
                Try adjusting your search or filter to find available projects.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                className="px-5 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:border-zinc-400 transition-all"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  delay={index}
                  onViewDetails={handleViewDetails}
                  onInvest={handleInvestClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ProjectDetailsModal
        project={selectedProject}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedProject(null);
        }}
        onInvest={handleInvestClick}
      />

      <InvestModal
        project={selectedProject}
        isOpen={isInvestModalOpen}
        onClose={() => {
          setIsInvestModalOpen(false);
          setSelectedProject(null);
        }}
        onSuccess={handleInvestSuccess}
      />
    </div>
  );
}
