"use client";

import { useState } from "react";
import { 
  Zap, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  History,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useInstallerProjects } from "@/hooks/use-dashboard-data";
import { projectApi } from "@/lib/api";
import { toast } from "sonner";

export function ProductionSection() {
  const { projects, loading: projectsLoading } = useInstallerProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [energy, setEnergy] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const activeProjects = projects.filter(p => p.status === "ACTIVE" || p.status === "COMPLETED");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !energy || !date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const response = await projectApi.reportProduction(selectedProjectId, {
        energyProduced: Number(energy),
        recordedAt: new Date(date).toISOString(),
        notes: notes || undefined
      });

      if (response.success) {
        toast.success("Production data recorded successfully");
        setEnergy("");
        setNotes("");
      } else {
        toast.error(response.error || "Failed to record production data");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reporting Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-solar-orange" />
              Report Production
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Select Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  required
                >
                  <option value="">Choose a project...</option>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Energy Produced (kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={energy}
                  onChange={(e) => setEnergy(e.target.value)}
                  placeholder="e.g. 450.5"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Recording Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any maintenance or weather notes..."
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[100px]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || activeProjects.length === 0}
                className="w-full py-3 px-4 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Submit Production Record
              </button>

              {activeProjects.length === 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Only active projects currently producing energy can be reported.</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Stats & History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm text-muted-foreground">Total Production</span>
              </div>
              <p className="text-3xl font-bold">12.4 MWh</p>
              <p className="text-xs text-emerald-600 mt-1.5 font-medium">+14% from last month</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-muted-foreground">Avg. Daily Yield</span>
              </div>
              <p className="text-3xl font-bold">452 kWh</p>
              <p className="text-xs text-blue-600 mt-1.5 font-medium">Within expected range</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Recent Submissions
              </h3>
            </div>
            <div className="p-8 text-center">
              <History className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recent production records found.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
