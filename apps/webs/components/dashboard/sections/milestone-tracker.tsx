"use client";

import { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Upload, 
  ExternalLink,
  Loader2,
  FileText,
  Camera,
  Activity,
  Globe,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { milestoneApi, type ProjectMilestone } from "@/lib/api";

interface MilestoneTrackerProps {
  projectId: string;
  isAdmin?: boolean;
  onUpdate?: () => void;
}

const statusConfig = {
  PENDING: { 
    label: "Upcoming", 
    bg: "bg-zinc-100", 
    text: "text-zinc-500", 
    icon: Clock,
    border: "border-zinc-200"
  },
  SUBMITTED: { 
    label: "In Review", 
    bg: "bg-amber-100", 
    text: "text-amber-600", 
    icon: Clock,
    border: "border-amber-200"
  },
  VERIFIED: { 
    label: "Verified", 
    bg: "bg-blue-100", 
    text: "text-blue-600", 
    icon: CheckCircle2,
    border: "border-blue-200"
  },
  REJECTED: { 
    label: "Rejected", 
    bg: "bg-red-100", 
    text: "text-red-600", 
    icon: AlertCircle,
    border: "border-red-200"
  },
  RELEASED: { 
    label: "Completed", 
    bg: "bg-emerald-100", 
    text: "text-emerald-600", 
    icon: CheckCircle2,
    border: "border-emerald-200"
  },
};

const methodConfig = {
  DOCUMENT: { label: "Document", icon: FileText },
  PHOTO: { label: "Photo Proof", icon: Camera },
  IOT: { label: "IoT Data", icon: Activity },
  ORACLE: { label: "Oracle Verification", icon: Globe },
};

export function MilestoneTracker({ projectId, isAdmin = false, onUpdate }: MilestoneTrackerProps) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchMilestones = async () => {
    try {
      const response = await milestoneApi.getProjectMilestones(projectId);
      if (response.success && response.data) {
        setMilestones(response.data);
      } else {
        setError(response.error || "Failed to load milestones");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const handleSubmitProof = async (milestoneId: string) => {
    setSubmittingId(milestoneId);
    try {
      // Simulate proof submission with a dummy URL
      const response = await milestoneApi.submitProof(milestoneId, {
        documents: ["https://example.com/proof.pdf"],
        timestamp: new Date().toISOString()
      });
      
      if (response.success) {
        await fetchMilestones();
        onUpdate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleVerify = async (milestoneId: string) => {
    try {
      // @ts-expect-error - adminApi types
      const response = await adminApi.verifyMilestone(milestoneId);
      if (response.success) {
        await fetchMilestones();
        onUpdate?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold">Funding Milestones</h3>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
          {milestones.filter(m => m.status === 'RELEASED').length} / {milestones.length} Completed
        </span>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-zinc-100 before:z-0">
        {milestones.map((milestone, index) => {
          const status = statusConfig[milestone.status] || statusConfig.PENDING;
          const method = methodConfig[milestone.verificationMethod];
          const StatusIcon = status.icon;
          const MethodIcon = method.icon;
          
          return (
            <div key={milestone.id} className="relative flex items-start gap-6 z-10 group">
              {/* Circle indicator */}
              <div className={cn(
                "flex-none w-10 h-10 rounded-full flex items-center justify-center border-4 border-white transition-all duration-300",
                milestone.status === 'RELEASED' ? "bg-emerald-500 text-white" : 
                milestone.status === 'SUBMITTED' ? "bg-amber-500 text-white" :
                milestone.status === 'VERIFIED' ? "bg-blue-500 text-white" :
                "bg-zinc-200 text-zinc-500"
              )}>
                {milestone.status === 'RELEASED' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className="text-xs font-black">{index + 1}</span>
                )}
              </div>

              {/* Content card */}
              <div className={cn(
                "flex-1 bg-white border rounded-2xl p-5 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-zinc-200/50",
                status.border
              )}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <h4 className="font-bold text-zinc-900">{milestone.name}</h4>
                    <p className="text-sm text-zinc-500 mt-0.5">{milestone.description}</p>
                  </div>
                  <div className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5",
                    status.bg, status.text
                  )}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-50">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                    <DollarSign className="w-3.5 h-3.5" />
                    Release: {milestone.releasePercentage}% (${Number(milestone.releaseAmount).toLocaleString()})
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                    <MethodIcon className="w-3.5 h-3.5" />
                    Method: {method.label}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  {!isAdmin && (milestone.status === 'PENDING' || milestone.status === 'REJECTED') && (
                    <button 
                      onClick={() => handleSubmitProof(milestone.id)}
                      disabled={!!submittingId}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                      {submittingId === milestone.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      Submit Proof
                    </button>
                  )}

                  {isAdmin && milestone.status === 'SUBMITTED' && (
                    <>
                      <button 
                        onClick={() => handleVerify(milestone.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verify & Release
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}

                  {milestone.verificationTxHash && (
                    <a 
                      href={`https://stellar.expert/explorer/testnet/tx/${milestone.verificationTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      View on Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
