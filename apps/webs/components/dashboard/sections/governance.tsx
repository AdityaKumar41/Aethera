"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Vote,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposalType: string;
  status:
    | "Active"
    | "Passed"
    | "Failed"
    | "Expired"
    | "Executed"
    | "Cancelled"
    | string;
  yesVotes: string;
  noVotes: string;
  abstainVotes: string;
  proposer: string;
  createdAt: string;
  txHash?: string;
}

interface MyVote {
  proposalId: string;
  proposalTitle: string;
  choice: "Yes" | "No" | "Abstain";
  timestamp: string;
  txHash?: string;
}

const PROPOSAL_TYPES = [
  { value: "ParameterChange", label: "Parameter Change" },
  { value: "OracleApproval", label: "Oracle Approval" },
  { value: "EmergencyPause", label: "Emergency Pause" },
  { value: "TreasuryRelease", label: "Treasury Release" },
  { value: "ProtocolUpgrade", label: "Protocol Upgrade" },
  { value: "General", label: "General" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  Active: {
    label: "Active",
    color: "bg-emerald-100 text-emerald-700",
    icon: Zap,
  },
  Passed: {
    label: "Passed",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  Failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  Expired: {
    label: "Expired",
    color: "bg-zinc-100 text-zinc-600",
    icon: Clock,
  },
  Executed: {
    label: "Executed",
    color: "bg-purple-100 text-purple-700",
    icon: CheckCircle,
  },
  Cancelled: {
    label: "Cancelled",
    color: "bg-orange-100 text-orange-700",
    icon: XCircle,
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] || {
      label: status,
      color: "bg-zinc-100 text-zinc-600",
      icon: AlertCircle,
    }
  );
}

// ─── Vote Progress Bar ────────────────────────────────────────────────────────

function VoteBar({
  yes,
  no,
  abstain,
}: {
  yes: number;
  no: number;
  abstain: number;
}) {
  const total = yes + no + abstain;
  if (total === 0) {
    return <p className="text-xs text-muted-foreground">No votes yet</p>;
  }
  const yesPct = (yes / total) * 100;
  const noPct = (no / total) * 100;
  const abstainPct = (abstain / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-red-400 transition-all"
          style={{ width: `${noPct}%` }}
        />
        <div
          className="bg-zinc-300 transition-all"
          style={{ width: `${abstainPct}%` }}
        />
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          Yes {yesPct.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
          No {noPct.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-zinc-300" />
          Abstain {abstainPct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  onVote,
  voting,
}: {
  proposal: Proposal;
  onVote: (
    proposalId: string,
    choice: "Yes" | "No" | "Abstain",
  ) => Promise<void>;
  voting: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<
    "Yes" | "No" | "Abstain" | null
  >(null);

  const yes = Number(proposal.yesVotes) || 0;
  const no = Number(proposal.noVotes) || 0;
  const abstain = Number(proposal.abstainVotes) || 0;
  const isActive = proposal.status === "Active";
  const isVoting = voting === proposal.id;

  const cfg = getStatusConfig(proposal.status);
  const StatusIcon = cfg.icon;

  const handleVote = async (choice: "Yes" | "No" | "Abstain") => {
    setPendingChoice(choice);
    await onVote(proposal.id, choice);
    setPendingChoice(null);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden transition-all hover:shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                {PROPOSAL_TYPES.find((t) => t.value === proposal.proposalType)
                  ?.label || proposal.proposalType}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                  cfg.color,
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>
            </div>
            <h3 className="font-semibold text-zinc-900 leading-snug">
              {proposal.title}
            </h3>
          </div>
        </div>

        {expanded && (
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {proposal.description}
          </p>
        )}

        <div className="mb-4">
          <VoteBar yes={yes} no={no} abstain={abstain} />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-zinc-700 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Details
              </>
            )}
          </button>

          {isActive && (
            <div className="flex gap-2">
              {(["Yes", "No", "Abstain"] as const).map((choice) => (
                <button
                  key={choice}
                  onClick={() => handleVote(choice)}
                  disabled={isVoting}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all",
                    choice === "Yes"
                      ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      : choice === "No"
                        ? "border-red-300 text-red-700 hover:bg-red-50"
                        : "border-zinc-300 text-zinc-600 hover:bg-zinc-50",
                    isVoting && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {isVoting && pendingChoice === choice ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    choice
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Proposal Form ─────────────────────────────────────────────────────

function CreateProposalForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposalType, setProposalType] = useState("General");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await apiRequest<{ txHash: string }>(
        "/api/governance/proposals",
        {
          method: "POST",
          body: { title, description, proposalType },
        },
      );

      if (!res.success) {
        setError(res.error || "Failed to create proposal");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setTitle("");
        setDescription("");
        setProposalType("General");
        setSuccess(false);
        onSuccess();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <p className="text-base font-semibold text-zinc-900">
          Proposal submitted on-chain!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Title
        </label>
        <input
          type="text"
          required
          minLength={5}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Proposal title…"
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Type
        </label>
        <select
          value={proposalType}
          onChange={(e) => setProposalType(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {PROPOSAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Description
        </label>
        <textarea
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your proposal in detail…"
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        Submit Proposal
      </button>
    </form>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

const TABS = ["Active Proposals", "My Votes", "Create Proposal"] as const;
type Tab = (typeof TABS)[number];

export function GovernanceSection() {
  const [activeTab, setActiveTab] = useState<Tab>("Active Proposals");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [myVotes, setMyVotes] = useState<MyVote[]>([]);
  const [votingPower, setVotingPower] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voting, setVoting] = useState<string | null>(null);
  const [voteError, setVoteError] = useState("");

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [proposalsRes, vpRes, votesRes] = await Promise.all([
        apiRequest<{ proposals: Proposal[] }>("/api/governance/proposals"),
        apiRequest<{ votingPower: string }>("/api/governance/voting-power"),
        apiRequest<{ votes: MyVote[] }>("/api/governance/my-votes"),
      ]);

      if (proposalsRes.success && proposalsRes.data) {
        setProposals(proposalsRes.data.proposals || []);
      }
      if (vpRes.success && vpRes.data) {
        setVotingPower(vpRes.data.votingPower || "0");
      }
      if (votesRes.success && votesRes.data) {
        setMyVotes(votesRes.data.votes || []);
      }
    } catch {
      setError("Failed to load governance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleVote = async (
    proposalId: string,
    choice: "Yes" | "No" | "Abstain",
  ) => {
    setVoting(proposalId);
    setVoteError("");
    try {
      const res = await apiRequest<{ txHash: string }>(
        `/api/governance/proposals/${proposalId}/vote`,
        { method: "POST", body: { choice } },
      );
      if (!res.success) {
        setVoteError(res.error || "Vote failed");
      } else {
        // Refresh proposals to get updated tallies
        await fetchProposals();
      }
    } catch {
      setVoteError("Unexpected error while voting");
    } finally {
      setVoting(null);
    }
  };

  const formatVotingPower = (vp: string) => {
    const n = BigInt(vp || "0");
    if (n === BigInt(0)) return "0";
    const formatted = Number(n) / 1e7;
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Governance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vote on proposals that shape the Aethera protocol
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Vote className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">
            {formatVotingPower(votingPower)} voting power
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Vote error banner */}
      {voteError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {voteError}
          <button
            onClick={() => setVoteError("")}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Active Proposals ── */}
      {activeTab === "Active Proposals" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading proposals…
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={fetchProposals}
                className="text-xs text-emerald-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white border border-zinc-200 rounded-2xl">
              <Vote className="w-10 h-10 text-zinc-300" />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700">
                  No proposals yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Be the first to create a proposal
                </p>
              </div>
              <button
                onClick={() => setActiveTab("Create Proposal")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Proposal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onVote={handleVote}
                  voting={voting}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── My Votes ── */}
      {activeTab === "My Votes" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : myVotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-zinc-200 rounded-2xl">
              <Vote className="w-10 h-10 text-zinc-300" />
              <p className="text-sm text-zinc-500">
                You haven&apos;t voted on any proposals yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myVotes.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {v.proposalTitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(v.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold px-3 py-1 rounded-full",
                      v.choice === "Yes"
                        ? "bg-emerald-100 text-emerald-700"
                        : v.choice === "No"
                          ? "bg-red-100 text-red-700"
                          : "bg-zinc-100 text-zinc-600",
                    )}
                  >
                    {v.choice}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Create Proposal ── */}
      {activeTab === "Create Proposal" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-1">
            Create a New Proposal
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Proposals are submitted on-chain and require token holders to vote.
            Ensure your wallet is funded and your KYC is verified.
          </p>
          <CreateProposalForm
            onSuccess={() => {
              setActiveTab("Active Proposals");
              fetchProposals();
            }}
          />
        </div>
      )}
    </div>
  );
}
