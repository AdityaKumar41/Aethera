"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { InvestModal } from "@/components/dashboard/invest-modal";
import { ProjectDetailsModal } from "@/components/dashboard/project-details-modal";
import { Search, Sparkles, Filter, LayoutGrid } from "lucide-react";
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

  // Modal state
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

  // Transform API data
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
    { label: "All Opportunities", value: "all" },
    { label: "Funding", value: "funding" },
    { label: "Settled", value: "funded" },
    { label: "Yielding", value: "producing" },
  ];

  const featured = projects.length > 0 ? projects[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Hero Banner */}
      {featured && (
        <div className="relative group overflow-hidden rounded-[2.5rem] bg-white border border-zinc-200 p-8 shadow-sm">
          <div className="absolute inset-0 bg-linear-to-br from-orange-50 to-emerald-50 opacity-40" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-orange-100 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                  Top Opportunity
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-orange-500" />
                  Staff Pick
                </div>
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight leading-none">
                {featured.name}
              </h2>

              <p className="text-zinc-500 font-medium max-w-md leading-relaxed">
                Connect your capital to verified solar infrastructure and earn
                sustainable yields powered by the sun.
              </p>

              <div className="flex flex-wrap gap-8 py-4 border-y border-zinc-100">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                    Target Yield
                  </p>
                  <p className="text-2xl font-black text-emerald-600">
                    {featured.expectedYield}% APY
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                    Token Entry
                  </p>
                  <p className="text-2xl font-black text-zinc-900">
                    ${Number(featured.pricePerToken) || 100}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleInvestClick(featured.id)}
                className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/10 active:scale-95"
              >
                Start Investing
              </button>
            </div>

            <div className="hidden lg:block relative aspect-video rounded-3xl bg-zinc-50 border border-zinc-200 overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-linear-to-tr from-orange-500/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <LayoutGrid className="w-16 h-16 text-zinc-200" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discovery Area */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
            Browse Inventory
          </h3>
          <p className="text-zinc-500 font-medium text-xs">
            Discover verified high-capacity solar assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 border border-zinc-200 overflow-x-auto max-w-full">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all",
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
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-100 border-t-orange-500 animate-spin" />
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Scanning Market...
          </p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              delay={index}
              onViewDetails={handleViewDetails}
              onInvest={handleInvestClick}
            />
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full py-20 text-center rounded-[2.5rem] bg-zinc-50 border border-dashed border-zinc-200">
              <Filter className="w-10 h-10 text-zinc-200 mx-auto mb-4" />
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                No assets match filters
              </p>
            </div>
          )}
        </div>
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
