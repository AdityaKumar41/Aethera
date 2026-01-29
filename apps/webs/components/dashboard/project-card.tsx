"use client";

import { cn } from "@/lib/utils";
import { MapPin, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

interface Project {
    id: string;
    name: string;
    location: string;
    capacity: string;
    fundingProgress: number;
    fundingGoal: number;
    currentFunding: number;
    expectedYield: number;
    tokenPrice: number;
    status: "funding" | "funded" | "producing";
    image?: string;
}

interface ProjectCardProps {
    project: Project;
    delay?: number;
    onInvest?: (id: string) => void;
}

const statusConfig = {
    funding: { label: "Funding", color: "bg-blue-500" },
    funded: { label: "Funded", color: "bg-emerald-500" },
    producing: { label: "Producing", color: "bg-amber-500" },
    active: { label: "Active", color: "bg-amber-500" },
    completed: { label: "Completed", color: "bg-zinc-500" },
    draft: { label: "Draft", color: "bg-zinc-400" },
    pending_approval: { label: "Pending", color: "bg-orange-400" },
    approved: { label: "Approved", color: "bg-blue-400" },
    rejected: { label: "Rejected", color: "bg-red-500" },
};

export function ProjectCard({ project, delay = 0, onInvest }: ProjectCardProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay * 100);
        return () => clearTimeout(timer);
    }, [delay]);

    const config = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.active;

    return (
        <div
            className={cn(
                "group bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                "hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5"
            )}
            style={{ transitionDelay: `${delay * 50}ms` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image placeholder */}
            <div className="relative h-40 bg-linear-to-br from-amber-400 via-orange-500 to-red-500 overflow-hidden">
                <div className="absolute inset-0 bg-black/20" />
                <div className={cn(
                    "absolute inset-0 bg-linear-to-t from-black/60 to-transparent transition-opacity duration-300",
                    isHovered ? "opacity-100" : "opacity-0"
                )} />

                {/* Status badge */}
                <span className={cn(
                    "absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium text-white",
                    config.color
                )}>
                    {config.label}
                </span>

                {/* Capacity badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                    <Zap className="w-3.5 h-3.5" />
                    {project.capacity}
                </div>
            </div>

            <div className="p-5">
                {/* Title and location */}
                <h3 className="font-semibold text-lg mb-1 group-hover:text-accent transition-colors">
                    {project.name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.location}
                </div>

                {/* Funding progress */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Funding Progress</span>
                        <span className="font-medium">{project.fundingProgress}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                project.fundingProgress >= 100
                                    ? "bg-emerald-500"
                                    : "bg-linear-to-r from-amber-400 to-orange-500"
                            )}
                            style={{ width: `${Math.min(project.fundingProgress, 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>${project.currentFunding.toLocaleString()} raised</span>
                        <span>Goal: ${project.fundingGoal.toLocaleString()}</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Expected Yield
                        </div>
                        <p className="font-semibold text-success">{project.expectedYield}% APY</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50">
                        <div className="text-xs text-muted-foreground mb-1">Token Price</div>
                        <p className="font-semibold">${project.tokenPrice}</p>
                    </div>
                </div>

                {/* CTA */}
                <button
                    disabled={project.status !== "funding"}
                    onClick={() => onInvest && onInvest(project.id)}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200",
                        project.status === "funding"
                            ? "bg-foreground text-background hover:opacity-90"
                            : "bg-secondary text-muted-foreground cursor-not-allowed"
                    )}
                >
                    {project.status === "funding" ? (
                        <>
                            Invest Now
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                    ) : project.status === "funded" ? (
                        "Fully Funded"
                    ) : (
                        "View Project"
                    )}
                </button>
            </div>
        </div>
    );
}
