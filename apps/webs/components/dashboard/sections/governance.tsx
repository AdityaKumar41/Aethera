"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Vote, Clock, CheckCircle2, XCircle, Users, TrendingUp, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

const proposals: { id: string; title: string; description: string; status: "active" | "passed" | "rejected" | "pending"; votesFor: number; votesAgainst: number; votesAbstain: number; totalVotes: number; quorum: number; endDate: string; category: string }[] = [];

const statusConfig = {
    active: { label: "Active", color: "bg-blue-500", textColor: "text-blue-600" },
    passed: { label: "Passed", color: "bg-emerald-500", textColor: "text-emerald-600" },
    rejected: { label: "Rejected", color: "bg-red-500", textColor: "text-red-600" },
    pending: { label: "Pending", color: "bg-amber-500", textColor: "text-amber-600" },
};

type FilterStatus = "all" | "active" | "passed" | "rejected";

export function GovernanceSection() {
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [selectedProposal, setSelectedProposal] = useState<typeof proposals[0] | null>(null);

    const filteredProposals = proposals.filter((p) => {
        return filterStatus === "all" || p.status === filterStatus;
    });

    const userVotingPower = 0;
    const activeProposals = proposals.filter((p) => p.status === "active").length;

    const handleVote = (proposalId: string, vote: "for" | "against" | "abstain") => {
        // Simulate voting
        console.log(`Voted ${vote} on proposal ${proposalId}`);
        setSelectedProposal(null);
    };

    return (
        <div className="space-y-6">
            {/* Voting power card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl gradient-yield flex items-center justify-center">
                            <Vote className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground">Your Voting Power</span>
                    </div>
                    <p className="text-3xl font-bold">{userVotingPower.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Based on token holdings</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl gradient-solar flex items-center justify-center">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground">Active Proposals</span>
                    </div>
                    <p className="text-3xl font-bold">{activeProposals}</p>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting your vote</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl gradient-energy flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground">Participation Rate</span>
                    </div>
                    <p className="text-3xl font-bold">78%</p>
                    <p className="text-xs text-muted-foreground mt-1">Average governance participation</p>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                    { label: "All Proposals", value: "all" as FilterStatus },
                    { label: "Active", value: "active" as FilterStatus },
                    { label: "Passed", value: "passed" as FilterStatus },
                    { label: "Rejected", value: "rejected" as FilterStatus },
                ].map((filter) => (
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

            {/* Proposals list */}
            <div className="space-y-4">
                {filteredProposals.map((proposal) => {
                    const config = statusConfig[proposal.status];
                    const forPercent = (proposal.votesFor / proposal.totalVotes) * 100;
                    const againstPercent = (proposal.votesAgainst / proposal.totalVotes) * 100;
                    const quorumMet = proposal.totalVotes >= proposal.quorum;

                    return (
                        <div
                            key={proposal.id}
                            className="bg-card border border-border rounded-2xl p-5 hover:border-accent/50 transition-all duration-200"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium text-white",
                                            config.color
                                        )}>
                                            {config.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{proposal.category}</span>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{proposal.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{proposal.description}</p>
                                </div>

                                {proposal.status === "active" && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleVote(proposal.id, "for")}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
                                        >
                                            <ThumbsUp className="w-4 h-4" />
                                            For
                                        </button>
                                        <button
                                            onClick={() => handleVote(proposal.id, "against")}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors text-sm font-medium"
                                        >
                                            <ThumbsDown className="w-4 h-4" />
                                            Against
                                        </button>
                                        <button
                                            onClick={() => handleVote(proposal.id, "abstain")}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                                        >
                                            <Minus className="w-4 h-4" />
                                            Abstain
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Voting bar */}
                            <div className="space-y-2">
                                <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${forPercent}%` }}
                                    />
                                    <div
                                        className="h-full bg-red-500 transition-all duration-500"
                                        style={{ width: `${againstPercent}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            For: {forPercent.toFixed(1)}%
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                            Against: {againstPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className={cn(
                                            "flex items-center gap-1",
                                            quorumMet ? "text-success" : "text-warning"
                                        )}>
                                            {quorumMet ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                            {quorumMet ? "Quorum met" : `${((proposal.totalVotes / proposal.quorum) * 100).toFixed(0)}% to quorum`}
                                        </span>
                                        {proposal.status === "active" && (
                                            <span>• Ends {proposal.endDate}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredProposals.length === 0 && (
                <div className="text-center py-12">
                    <Vote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No proposals found.</p>
                </div>
            )}
        </div>
    );
}
