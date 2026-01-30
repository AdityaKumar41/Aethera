"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { InvestModal } from "@/components/dashboard/invest-modal";
import { Search, Loader2 } from "lucide-react";
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

  // Investment modal state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);

  const handleInvestClick = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setSelectedProject(project);
      setIsInvestModalOpen(true);
    }
  };

  const handleInvestSuccess = () => {
    refetch();
    setIsInvestModalOpen(false);
    setSelectedProject(null);
  };

  // Transform API data to match component expectations
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
    status: project.status.toLowerCase() as any,
    image: "/placeholder-solar.jpg",
  }));

  const filteredProjects = mappedProjects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const statusFilters: { label: string; value: FilterStatus }[] = [
    { label: "All Projects", value: "all" },
    { label: "Funding", value: "funding" },
    { label: "Funded", value: "funded" },
    { label: "Producing", value: "producing" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                filterStatus === filter.value
                  ? "bg-foreground text-background"
                  : "bg-zinc-100 text-muted-foreground hover:text-foreground hover:bg-zinc-200",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured project banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-amber-500 via-orange-500 to-red-500 p-6 sm:p-8">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium mb-4">
            🔥 Featured Project
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {projects.length > 0 ? projects[0].name : "Coming Soon"}
          </h3>
          <p className="text-white/80 mb-4 max-w-lg">
            {projects.length > 0
              ? projects[0].description?.slice(0, 120) + "..."
              : "New solar investment opportunities are coming soon. Be the first to invest!"}
          </p>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="text-white">
              <p className="text-white/60 text-xs">Expected Yield</p>
              <p className="text-xl font-bold">
                {projects.length > 0
                  ? `${projects[0].expectedYield}% APY`
                  : "-- APY"}
              </p>
            </div>
            <div className="text-white">
              <p className="text-white/60 text-xs">Token Price</p>
              <p className="text-xl font-bold">
                {projects.length > 0
                  ? `$${Number(projects[0].pricePerToken) || 0}`
                  : "$--"}
              </p>
            </div>
            <div className="text-white">
              <p className="text-white/60 text-xs">Funding Progress</p>
              <p className="text-xl font-bold">
                {projects.length > 0
                  ? `${Math.round(projects[0].fundingPercentage || 0)}%`
                  : "--%"}
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              projects.length > 0 && handleInvestClick(projects[0].id)
            }
            className="px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            Invest Now
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading projects...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Projects grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              delay={index}
              onInvest={handleInvestClick}
            />
          ))}
        </div>
      )}

      {!loading && !error && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {projects.length === 0
              ? "No projects available yet. Check back soon!"
              : "No projects found matching your criteria."}
          </p>
        </div>
      )}

      {/* Investment Modal */}
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
