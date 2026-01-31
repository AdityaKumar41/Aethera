"use client";

import { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Zap, 
  DollarSign, 
  Calendar,
  ShieldCheck,
  TrendingUp,
  LayoutDashboard,
  Settings,
  Activity,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  AlertTriangle,
  SignalLow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectApi, type Project } from "@/lib/api";
import { MilestoneTracker } from "./milestone-tracker";
import { IoTDeviceManager } from "./iot-device-manager";

interface ProjectDetailsSectionProps {
  projectId: string;
  onBack: () => void;
}

const statusConfig = {
  DRAFT: { label: "Draft", color: "bg-zinc-500", icon: Clock },
  PENDING_APPROVAL: { label: "Pending Review", color: "bg-amber-500", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-blue-500", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-500", icon: ShieldCheck },
  FUNDING: { label: "Funding", color: "bg-purple-500", icon: DollarSign },
  FUNDED: { label: "Funded", color: "bg-emerald-500", icon: CheckCircle2 },
  ACTIVE_PENDING_DATA: { label: "Waiting for Data", color: "bg-emerald-600", icon: SignalLow },
  ACTIVE: { label: "Active", color: "bg-green-500", icon: Zap },
  COMPLETED: { label: "Completed", color: "bg-zinc-600", icon: CheckCircle2 },
};

export function ProjectDetailsSection({ projectId, onBack }: ProjectDetailsSectionProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const response = await projectApi.getProject(projectId);
        if (response.success && response.data) {
          setProject(response.data);
        } else {
          setError(response.error || "Failed to load project details");
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-3xl">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-muted-foreground font-medium">Fetching project data...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-card border border-border rounded-3xl p-12 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold mb-2">Error Loading Project</h3>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          {error || "We couldn't find the project you're looking for."}
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-foreground text-background rounded-xl font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const statusInfo = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.DRAFT;
  const fundingProgress = (Number(project.fundingRaised) / Number(project.fundingTarget)) * 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Alert for Pending Data or Activation */}
      {(project.status === 'ACTIVE_PENDING_DATA' || project.status === 'FUNDED') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">
               {project.status === 'FUNDED' ? 'Action Required: Connect IoT Device to Activate' : 'Action Required: Connect IoT Device'}
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              {project.status === 'FUNDED' 
                ? "Your project is fully funded. Please connect your IoT device to enable final activation and capital release."
                : "Your project is active, but we haven't received any production data yet. Please connect your IoT device to start tracking energy generation and earning yield."
              }
            </p>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-foreground rounded-xl text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        <div className="flex items-center gap-2">
          {project.status === 'ACTIVE' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
              <Activity className="w-4 h-4" />
              Report Production
            </button>
          )}
          <button className="p-2 bg-white border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-zinc-50 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Core Info & Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2",
                  statusInfo.color
                )}>
                  {<statusInfo.icon className="w-3.5 h-3.5" />}
                  {statusInfo.label}
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold font-mono">
                  {project.tokenSymbol}
                </span>
              </div>

              <h1 className="text-4xl font-black mb-4 tracking-tight">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold">{project.location}, {project.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">{project.capacity} kW Installed Capacity</span>
                </div>
              </div>

              <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-2xl">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Project Overview</h3>
                <p className="text-zinc-700 leading-relaxed font-medium">
                  {project.description}
                </p>
              </div>
            </div>
          </div>

          {/* IoT Manager Section */}
          {(project.status === 'ACTIVE' || project.status === 'ACTIVE_PENDING_DATA' || project.status === 'FUNDED') && (
             <div className="bg-card border border-border rounded-3xl p-8">
               <div className="mb-6">
                 <h3 className="text-lg font-bold flex items-center gap-2">
                   <Zap className="w-5 h-5 text-solar-orange" />
                   Device Management
                 </h3>
                 <p className="text-sm text-muted-foreground">Manage connected IoT devices for real-time energy tracking.</p>
               </div>
               <IoTDeviceManager projectId={project.id} />
             </div>
          )}

          {/* Milestone Tracker Section */}
          {project.fundingModel === 'MILESTONE_BASED' && (
            <div className="bg-card border border-border rounded-3xl p-8">
              <MilestoneTracker 
                projectId={project.id} 
                onUpdate={() => {
                  const fetchProject = async () => {
                    const response = await projectApi.getProject(projectId);
                    if (response.success && response.data) {
                      setProject(response.data);
                    }
                  };
                  fetchProject();
                }}
              />
            </div>
          )}

          <div className="bg-card border border-border rounded-3xl p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Investment performance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Expected Yield</p>
                <p className="text-2xl font-black text-emerald-600">{project.expectedYield}% <span className="text-xs text-muted-foreground font-medium">APY</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Price Per Token</p>
                <p className="text-2xl font-black">${project.pricePerToken}</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Total Tokens</p>
                <p className="text-2xl font-black">{project.totalTokens.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financials & Status */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8 bg-linear-to-b from-white to-zinc-50/50 shadow-xl shadow-zinc-200/50">
            <h3 className="text-lg font-bold mb-6">Funding Status</h3>
            
            <div className="mb-8">
              <div className="flex items-end justify-between mb-3">
                <div className="space-y-1">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Amount Raised</p>
                  <p className="text-3xl font-black text-zinc-900">${Number(project.fundingRaised).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-muted-foreground uppercase mb-1">Target</p>
                  <p className="text-lg font-bold text-zinc-400">${Number(project.fundingTarget).toLocaleString()}</p>
                </div>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                />
                {fundingProgress > 100 && (
                  <div className="absolute inset-0 bg-emerald-400/20 animate-pulse" />
                )}
              </div>
              <p className="text-[10px] text-right mt-2 font-black text-emerald-600 tracking-widest">
                {Math.round(fundingProgress)}% COMPLETION
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t border-dotted border-zinc-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Tokens Issued
                </span>
                <span className="font-bold">{project.totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  Available Tokens
                </span>
                <span className="font-bold text-blue-600">{project.tokensRemaining.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Investor Count
                </span>
                <span className="font-bold text-purple-600">{project.investorCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8">
            <h3 className="text-lg font-bold mb-6">Network Information</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Token Issuer (Network)</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-500">Stellar Testnet</span>
                  <a 
                    href={`https://stellar.expert/explorer/testnet/asset/${project.tokenSymbol}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase"
                  >
                    View Asset
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              
              {project.status === 'ACTIVE' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Current Production</p>
                  <p className="text-2xl font-black text-emerald-950">
                    {Number(project.totalEnergyProduced || 0).toLocaleString()} <span className="text-xs font-bold text-emerald-700">kWh</span>
                  </p>
                  <p className="text-[10px] text-emerald-700/60 font-bold uppercase mt-1">Live from Network Sensors</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
