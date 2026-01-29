"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const solarProjects: { id: string; name: string; location: string; capacity: string; fundingProgress: number; fundingGoal: number; currentFunding: number; expectedYield: number; tokenPrice: number; status: "funding" | "funded" | "producing"; image: string }[] = [];

type FilterStatus = "all" | "funding" | "funded" | "producing";

export function MarketplaceSection() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

    const filteredProjects = solarProjects.filter((project) => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === "all" || project.status === filterStatus;
        return matchesSearch && matchesFilter;
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
                        className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent transition-all duration-200"
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
                                    : "bg-secondary text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Featured project banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 sm:p-8">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium mb-4">
                        🔥 Featured Project
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Desert Star Array
                    </h3>
                    <p className="text-white/80 mb-4 max-w-lg">
                        5.0 MW utility-scale solar installation in Arizona. Premium location with 300+ sunny days per year.
                    </p>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="text-white">
                            <p className="text-white/60 text-xs">Expected Yield</p>
                            <p className="text-xl font-bold">14.2% APY</p>
                        </div>
                        <div className="text-white">
                            <p className="text-white/60 text-xs">Token Price</p>
                            <p className="text-xl font-bold">$25</p>
                        </div>
                        <div className="text-white">
                            <p className="text-white/60 text-xs">Funding Progress</p>
                            <p className="text-xl font-bold">45%</p>
                        </div>
                    </div>
                    <button className="px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold hover:bg-white/90 transition-colors">
                        Invest Now
                    </button>
                </div>
            </div>

            {/* Projects grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project, index) => (
                    <ProjectCard key={project.id} project={project} delay={index} />
                ))}
            </div>

            {filteredProjects.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No projects found matching your criteria.</p>
                </div>
            )}
        </div>
    );
}
