"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
  capacity: number;
  tokenSymbol: string;
}

interface ProductionRecord {
  id: string;
  energyProduced: number;
  recordedAt: string;
  source: string;
  verifiedBy: string;
  notes?: string;
}

export default function OracleDataPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [productionData, setProductionData] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    energyProduced: "",
    recordedAt: new Date().toISOString().split("T")[0],
    source: "manual",
    notes: "",
  });

  useEffect(() => {
    fetchActiveProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProductionData();
    }
  }, [selectedProject]);

  const fetchActiveProjects = async () => {
    try {
      const response = await api.get("/projects", {
        params: { status: "ACTIVE" },
      });
      setProjects(response.data.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load projects",
        variant: "destructive",
      });
    }
  };

  const fetchProductionData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/oracle/production/${selectedProject}`);
      setProductionData(response.data.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to load production data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/oracle/production", {
        projectId: selectedProject,
        energyProduced: parseFloat(formData.energyProduced),
        recordedAt: new Date(formData.recordedAt).toISOString(),
        source: formData.source,
        notes: formData.notes || undefined,
      });

      toast({
        title: "Success",
        description: "Production data recorded successfully",
      });

      // Reset form
      setFormData({
        energyProduced: "",
        recordedAt: new Date().toISOString().split("T")[0],
        source: "manual",
        notes: "",
      });

      // Refresh data
      await fetchProductionData();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to record production data",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateYield = async () => {
    if (!selectedProject) return;

    try {
      const response = await api.post(
        `/oracle/yield/${selectedProject}/calculate`,
        {
          periodStart: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          periodEnd: new Date().toISOString(),
          revenuePerKwh: 0.12,
        },
      );

      toast({
        title: "Yield Calculated",
        description: `Revenue: $${response.data.data.revenueGenerated.toFixed(2)} | Yield: $${response.data.data.yieldAmount.toFixed(2)}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to calculate yield",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Oracle Data Management</h1>
        <p className="text-gray-600 mt-2">
          Record and manage solar production data
        </p>
      </div>

      {/* Project Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="project">Select Active Project</Label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="">-- Select a project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.location}) - {project.capacity} kW
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {selectedProject && (
        <>
          {/* Data Entry Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Record Production Data
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="energyProduced">
                    Energy Produced (kWh) *
                  </Label>
                  <Input
                    id="energyProduced"
                    type="number"
                    step="0.01"
                    required
                    value={formData.energyProduced}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        energyProduced: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="recordedAt">Recording Date *</Label>
                  <Input
                    id="recordedAt"
                    type="date"
                    required
                    value={formData.recordedAt}
                    onChange={(e) =>
                      setFormData({ ...formData, recordedAt: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="source">Data Source</Label>
                <select
                  id="source"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="manual">Manual Entry</option>
                  <option value="iot_sensor">IoT Sensor</option>
                  <option value="inverter_api">Inverter API</option>
                  <option value="utility_meter">Utility Meter</option>
                  <option value="third_party">Third Party</option>
                </select>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional information..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Recording..." : "Record Data"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={calculateYield}
                >
                  Calculate Yield (Last 30 Days)
                </Button>
              </div>
            </form>
          </Card>

          {/* Production History */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Production History</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : productionData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No production data recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {productionData.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">
                        {record.energyProduced.toFixed(2)} kWh
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(record.recordedAt)} • {record.source}
                      </div>
                      {record.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {record.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Verified by: {record.verifiedBy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
