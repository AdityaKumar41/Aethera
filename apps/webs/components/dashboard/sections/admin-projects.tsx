"use client";

import { useState, useEffect } from "react";
import { 
  Building2, 
  Search, 
  Filter, 
  MapPin, 
  BarChart3, 
  Clock, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { apiRequest, adminApi, type Project } from "@/lib/api";
import { toast } from "sonner";

export function AdminProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingProjects = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getPendingProjects();
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      toast.error("Failed to fetch pending projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProjects();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminApi.approveProject(id);
      if (response.success) {
        toast.success("Project approved and token contract deployed!");
        setProjects(prev => prev.filter(p => p.id !== id));
      } else {
        toast.error(response.error || "Failed to approve project");
      }
    } catch (err) {
      toast.error("An error occurred during approval");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;

    setProcessingId(id);
    try {
      const response = await adminApi.rejectProject(id, reason);
      if (response.success) {
        toast.success("Project rejected");
        setProjects(prev => prev.filter(p => p.id !== id));
      } else {
        toast.error(response.error || "Failed to reject project");
      }
    } catch (err) {
      toast.error("An error occurred during rejection");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Project Approvals
          </h2>
          <p className="text-muted-foreground">Review and approve new solar project submissions.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none w-[240px]"
            />
          </div>
          <button className="p-2 border border-border rounded-xl hover:bg-zinc-50 transition-colors">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
          <p className="text-muted-foreground">Loading pending submissions...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center">
          <Building2 className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No pending projects</h3>
          <p className="text-muted-foreground max-w-[280px] mx-auto">
            All solar project submissions have been reviewed.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Project Brief */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded-md tracking-wider">
                          PENDING REVIEW
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Submitted {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "recently"}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold group-hover:text-purple-600 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {project.location}, {project.country}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Capacity</p>
                      <p className="text-sm font-bold">{project.capacity} kW</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Funding Target</p>
                      <p className="text-sm font-bold">${Number(project.fundingTarget).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Exp. Yield</p>
                      <p className="text-sm font-bold text-emerald-600">{project.expectedYield}%</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Installer</p>
                      <p className="text-sm font-bold truncate">
                        {project.installer?.company || project.installer?.name || "Independent"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="lg:w-[220px] flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6">
                  <button 
                    onClick={() => handleApprove(project.id)}
                    disabled={!!processingId}
                    className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processingId === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Approve Project
                  </button>
                  <button 
                    onClick={() => handleReject(project.id)}
                    disabled={!!processingId}
                    className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    View Detailed Docs
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
