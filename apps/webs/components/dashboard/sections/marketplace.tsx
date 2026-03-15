"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { InvestModal } from "@/components/dashboard/invest-modal";
import { ProjectDetailsModal } from "@/components/dashboard/project-details-modal";
import { Search, Sparkles, Filter, LayoutGrid, ArrowRight, Sun, TrendingUp, ShieldCheck, Zap } from "lucide-react";
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
    status: (project.status === "ACTIVE" || project.status === "ACTIVE_PENDING_DATA") ? "producing" : project.status.toLowerCase() as any,
    image: "/hero-solar.png",
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
    <div className="space-y-16 animate-in fade-in duration-1000 pb-24">
      {/* Platform Level Statistics - Live Feed Feeling */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
         {[
           { label: 'Total TVL', val: '$2.4M', trend: '+12%', icon: TrendingUp },
           { label: 'Assets Produced', val: '142 GWh', trend: 'Live', icon: Zap },
           { label: 'Network Node', val: 'Stellar Mainnet', trend: 'Connected', icon: ShieldCheck },
           { label: 'Active Yielding', val: '18 Projects', trend: 'Global', icon: Sun },
         ].map((stat, i) => (
           <div key={stat.label} className="flex flex-col gap-1 p-4 rounded-3xl bg-zinc-50 border border-zinc-100/50 hover:bg-white hover:shadow-xl hover:shadow-zinc-200/30 transition-all duration-500 group">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-white border border-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <stat.icon className="w-4 h-4" />
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                  stat.trend === 'Live' || stat.trend === 'Connected' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                )}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-zinc-950 italic tracking-tighter">{stat.val}</p>
           </div>
         ))}
      </div>

      {/* Premium Discovery Banner */}
      {featured && (
        <div className="relative group overflow-hidden rounded-[4rem] bg-zinc-900 border border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)]">
          {/* Background Image with Parallax-like Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src="/hero-solar.png" 
              alt="Solar Field" 
              className="w-full h-full object-cover transition-transform duration-[3s] ease-out group-hover:scale-105 opacity-60"
            />
            <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(249,115,22,0.1),transparent_50%)]" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-end p-10 md:p-16 min-h-[550px]">
            <div className="space-y-8 max-w-xl text-left">
              <div className="flex items-center gap-4">
                <div className="px-4 py-1.5 rounded-full bg-orange-600 border border-orange-500/30 text-[10px] font-black text-white uppercase tracking-[0.2em] italic shadow-2xl shadow-orange-600/20">
                  Market Spotlight
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
                  <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                  Premium Grade Asset
                </div>
              </div>

              <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.85] italic lowercase underline decoration-white/10 underline-offset-[16px]">
                {featured.name}
              </h2>

              <p className="text-zinc-300 font-medium text-lg leading-relaxed opacity-70 italic max-w-lg">
                Utility-scale infrastructure in {featured.location}. 
                Democratizing institutional-grade renewables through Stellar-bound liquid asset tokens.
              </p>

              <div className="flex flex-wrap gap-12 py-10 border-y border-white/10">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                    Target Alpha
                  </p>
                  <p className="text-4xl font-black text-emerald-400 font-mono italic tracking-tighter">
                    {featured.expectedYield}% <span className="text-[12px] opacity-40 uppercase font-bold not-italic font-sans">apy</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                    Unit Price
                  </p>
                  <p className="text-4xl font-black text-white font-mono tracking-tighter">
                    ${Number(featured.pricePerToken) || 100} <span className="text-[12px] opacity-40 uppercase font-bold not-italic font-sans">usdc</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                    Capitalized
                  </p>
                  <p className="text-4xl font-black text-orange-600 font-mono tracking-tighter italic">
                    {featured.fundingPercentage?.toFixed(1)}%
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleViewDetails(featured.id)}
                className="group/btn relative px-12 h-16 bg-white text-zinc-950 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-orange-600 hover:text-white transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-orange-600/30 active:scale-95 flex items-center justify-center gap-4 w-fit overflow-hidden"
              >
                <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-950/10 scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-500" />
                Explore Global Infrastructure
                <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-2" />
              </button>
            </div>

            {/* Visual Glass Card - Network Integrity */}
            <div className="hidden lg:flex flex-col items-center justify-center p-10 rounded-[3rem] bg-zinc-950/40 backdrop-blur-3xl border border-white/10 space-y-6 shadow-2xl relative overflow-hidden group/glass">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)] opacity-0 group-hover/glass:opacity-100 transition-opacity duration-1000" />
              
              <div className="grid grid-cols-2 gap-4 w-full">
                 {[
                   { label: 'System', val: `${featured.capacity}kW PV` },
                   { label: 'Protocol', val: 'Stellar L1' },
                   { label: 'Security', val: 'Hardware' },
                   { label: 'Compliance', val: 'KYC/AML' }
                 ].map(stat => (
                   <div key={stat.label} className="p-5 rounded-[1.5rem] bg-white/5 border border-white/5 group-hover/glass:border-white/20 transition-all duration-500">
                      <p className="text-[9px] font-black text-white/20 uppercase mb-2 tracking-[0.2em] italic">{stat.label}</p>
                      <p className="text-sm font-black text-white uppercase tracking-tight">{stat.val}</p>
                   </div>
                 ))}
              </div>
              
              <div className="w-full h-px bg-white/10" />
              
              <div className="flex items-center justify-between w-full px-2">
                 <div className="flex items-center gap-3">
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Network Ledger Synchronized</p>
                 </div>
                 <LayoutGrid className="w-5 h-5 text-white/10" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discovery Area */}
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row gap-8 items-end justify-between border-b border-zinc-100 pb-12">
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-zinc-950 tracking-tighter italic lowercase underline decoration-zinc-100 underline-offset-8">
              Protocol Distribution.
            </h3>
            <p className="text-zinc-400 font-black uppercase tracking-[0.2em] text-[10px] italic">
              Access verified renewable energy infrastructure allocations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-96 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                placeholder="search global assets / geo-locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-14 pr-6 rounded-[1.5rem] bg-zinc-50 border border-zinc-200 text-sm font-bold text-zinc-950 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-zinc-950 transition-all placeholder:text-zinc-300 placeholder:italic lowercase"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1.5 rounded-[1.75rem] bg-zinc-100/50 border border-zinc-200/50 backdrop-blur-sm overflow-x-auto">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value)}
                  className={cn(
                    "px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-300",
                    filterStatus === filter.value
                      ? "bg-zinc-950 text-white shadow-xl shadow-zinc-950/20"
                      : "text-zinc-400 hover:text-zinc-600 hover:bg-white"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-zinc-100 border-t-orange-500 animate-spin" />
              <Sun className="absolute inset-0 m-auto w-5 h-5 text-orange-200" />
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] animate-pulse">
              Syncing Market Ledger...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 bg-zinc-50 rounded-[3rem] border border-zinc-200 border-dashed animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <Search className="w-8 h-8 text-zinc-300" />
                </div>
                <p className="text-zinc-950 font-black uppercase tracking-[0.2em] text-[11px] mb-2 italic">
                  Zero Assets Found
                </p>
                <p className="text-zinc-400 font-medium text-xs max-w-xs text-center leading-relaxed">
                  Adjust your search parameters or allocation filters to find available infrastructure opportunities.
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                  }}
                  className="mt-8 px-6 py-3 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-950 hover:border-zinc-950 transition-all active:scale-95"
                >
                  Reset Terminal View
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
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
      </div>

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
