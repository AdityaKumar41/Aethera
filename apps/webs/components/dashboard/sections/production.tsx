"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  History,
  TrendingUp,
  BarChart3,
  SignalLow,
} from "lucide-react";
import { useInstallerProjects } from "@/hooks/use-dashboard-data";
import { projectApi } from "@/lib/api";
import { toast } from "sonner";
import { IoTDeviceManager } from "./iot-device-manager";
import { SimulationGuide } from "./simulation-guide";

export function ProductionSection() {
  const { projects, loading: projectsLoading } = useInstallerProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [energy, setEnergy] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [productionHistory, setProductionHistory] = useState<any[]>([]);
  const [totalKwh, setTotalKwh] = useState<number>(0);
  const [avgDailyKwh, setAvgDailyKwh] = useState<number>(0);
  const [historyLoading, setHistoryLoading] = useState(true);

  const activeProjects = projects.filter(
    (p) =>
      p.status === "ACTIVE" ||
      p.status === "COMPLETED" ||
      p.status === "ACTIVE_PENDING_DATA",
  );

  const fetchProductionHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await projectApi.getMyProductionHistory();
      if (response.success && response.data) {
        setProductionHistory(response.data.records || []);
        setTotalKwh(response.data.totalKwh || 0);
        setAvgDailyKwh(response.data.avgDailyKwh || 0);
      }
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionHistory();
  }, []);

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
        notes: notes || undefined,
      });

      if (response.success) {
        toast.success("Production data recorded successfully");
        setEnergy("");
        setNotes("");
        fetchProductionHistory();
      } else {
        toast.error(response.error || "Failed to record production data");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatKwh = (kwh: number) => {
    if (kwh >= 1000) return `${(kwh / 1000).toFixed(2)} MWh`;
    return `${kwh.toFixed(1)} kWh`;
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reporting Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-zinc-100 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Report Production
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-500 block mb-1.5">
                  Select Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  required
                >
                  <option value="">Choose a project...</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-500 block mb-1.5">
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
                <label className="text-sm font-medium text-zinc-500 block mb-1.5">
                  Recording Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
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
                <label className="text-sm font-medium text-zinc-500 block mb-1.5">
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
                className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                  <span>
                    Only active projects currently producing energy can be
                    reported.
                  </span>
                </div>
              )}
            </form>

            {selectedProjectId && (
              <div className="mt-8 border-t border-zinc-100 pt-6">
                <IoTDeviceManager
                  projectId={selectedProjectId}
                  onDeviceRegistered={() => {}}
                />
              </div>
            )}
          </div>

          {selectedProjectId &&
            projects.find((p) => p.id === selectedProjectId)?.status ===
              "ACTIVE_PENDING_DATA" && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <SignalLow className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-orange-900 text-sm mb-1">
                    Awaiting First IoT Signal
                  </h4>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    This project is ready to go live! Once your registered
                    device sends its first verified telemetry packet, the status
                    will automatically switch to <strong>Active</strong>.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <code className="px-2 py-1 bg-white border border-orange-200 rounded text-[10px] font-mono text-orange-800">
                      PROJECT_ID={selectedProjectId}
                    </code>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Stats & History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm text-zinc-500">Total Production</span>
              </div>
              {historyLoading ? (
                <div className="h-8 w-24 bg-zinc-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold">{formatKwh(totalKwh)}</p>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Across all active projects
                  </p>
                </>
              )}
            </div>
            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-zinc-500">Avg. Per Record</span>
              </div>
              {historyLoading ? (
                <div className="h-8 w-24 bg-zinc-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold">{formatKwh(avgDailyKwh)}</p>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Average per submission
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-500" />
                Recent Submissions
              </h3>
              <span className="text-xs text-zinc-400">
                {productionHistory.length} records
              </span>
            </div>
            {historyLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              </div>
            ) : productionHistory.length === 0 ? (
              <div className="p-8 text-center">
                <History className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">
                  No production records yet. Submit your first report.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {productionHistory.slice(0, 20).map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {record.project?.name || "—"}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {new Date(record.recordedAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                        {record.notes && (
                          <span className="ml-2 text-zinc-300">
                            · {record.notes}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">
                        {Number(record.energyProduced).toFixed(1)} kWh
                      </p>
                      <p className="text-xs text-zinc-400 capitalize">
                        {record.source?.toLowerCase() || "manual"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedProjectId && (
            <div className="mt-6">
              <SimulationGuide projectId={selectedProjectId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
