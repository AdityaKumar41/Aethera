"use client";

import { useState, useEffect } from "react";
import { 
  Cpu, 
  Plus, 
  Activity, 
  Signal, 
  SignalLow,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Loader2,
  X
} from "lucide-react";
import { oracleApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IoTDevice {
  id: string;
  publicKey: string;
  model: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  lastSeen: string | null;
  metadata?: any;
}

interface IoTDeviceManagerProps {
  projectId: string;
  onDeviceRegistered?: () => void;
}

export function IoTDeviceManager({ projectId, onDeviceRegistered }: IoTDeviceManagerProps) {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [newPublicKey, setNewPublicKey] = useState("");
  const [newModel, setNewModel] = useState("ADA-Sim-v1");

  useEffect(() => {
    fetchDevices();
  }, [projectId]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await oracleApi.getProjectDevices(projectId);
      if (response.success) {
        setDevices(response.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPublicKey) return;

    setRegistering(true);
    try {
      const response = await oracleApi.registerDevice({
        projectId,
        publicKey: newPublicKey,
        metadata: { model: newModel }
      });

      if (response.success) {
        toast.success("Device registered successfully");
        setShowAddForm(false);
        setNewPublicKey("");
        fetchDevices();
        onDeviceRegistered?.();
      } else {
        toast.error(response.error || "Registration failed");
      }
    } catch (err) {
      toast.error("An error occurred during registration");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Syncing devices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Cpu className="w-4 h-4 text-solar-orange" />
          IoT Devices
        </h4>
        <button 
          onClick={() => setShowAddForm(true)}
          className="text-xs font-medium flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Register Device
        </button>
      </div>

      {showAddForm && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 relative animate-in fade-in slide-in-from-top-2">
          <button 
            onClick={() => setShowAddForm(false)}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Stellar Public Key
              </label>
              <input 
                type="text"
                placeholder="G..."
                value={newPublicKey}
                onChange={(e) => setNewPublicKey(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Model
                </label>
                <select 
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none"
                >
                  <option value="ADA-Sim-v1">ADA-Sim-v1 (Simulated)</option>
                  <option value="SolarNode-G2">SolarNode-G2</option>
                  <option value="SmartInverter-X">SmartInverter-X</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {registering ? <Loader2 className="w-3 h-3 animate-spin"/> : <ShieldCheck className="w-3 h-3"/>}
                  Authorize
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-zinc-300 rounded-xl">
          <Activity className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No devices linked to this project</p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => {
            const isOnline = device.lastSeen && (Date.now() - new Date(device.lastSeen).getTime() < 120000); // 2 mins
            return (
              <div key={device.id} className="bg-white border border-border rounded-xl p-3 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isOnline ? "bg-emerald-50 text-emerald-600" : "bg-zinc-50 text-zinc-400"
                  )}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold font-mono">{device.publicKey.slice(0, 4)}...{device.publicKey.slice(-4)}</p>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full animate-pulse",
                        isOnline ? "bg-emerald-500" : "bg-zinc-300"
                      )} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{device.model} • {isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-muted-foreground hover:text-solar-orange rounded-md hover:bg-orange-50 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
