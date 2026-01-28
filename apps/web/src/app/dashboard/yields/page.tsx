"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Sun, TrendingUp } from "lucide-react";

interface YieldClaim {
  id: string;
  amount: number;
  claimed: boolean;
  claimedAt?: string;
  txHash?: string;
  distribution: {
    id: string;
    period: string;
    project: {
      name: string;
      location: string;
    };
  };
}

interface YieldSummary {
  totalClaimed: number;
  totalPending: number;
  claimedCount: number;
  pendingCount: number;
  totalYield: number;
  recentClaims: YieldClaim[];
  pendingClaims: YieldClaim[];
}

export default function YieldsPage() {
  const [summary, setSummary] = useState<YieldSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [batchClaiming, setBatchClaiming] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchYieldSummary();
  }, []);

  const fetchYieldSummary = async () => {
    try {
      const response = await api.get("/yields/summary");
      setSummary(response.data.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load yield data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSingle = async (claimId: string) => {
    setClaiming(claimId);
    try {
      const response = await api.post(`/yields/claim/${claimId}`);
      toast({
        title: "Success",
        description: response.data.message || "Yield claimed successfully",
      });
      await fetchYieldSummary();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to claim yield",
        variant: "destructive",
      });
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimAll = async () => {
    if (!summary?.pendingClaims.length) return;

    setBatchClaiming(true);
    try {
      const claimIds = summary.pendingClaims.map((c) => c.id);
      const response = await api.post("/yields/claim/batch", { claimIds });
      toast({
        title: "Success",
        description: response.data.message || "All yields claimed successfully",
      });
      await fetchYieldSummary();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to claim yields",
        variant: "destructive",
      });
    } finally {
      setBatchClaiming(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading yield data...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">No yield data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          Yield Portfolio
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Track and claim your automated energy production yields from the Stellar blockchain.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card card-hover p-6 border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sun className="h-20 w-20 text-white -mr-6 -mt-6" />
          </div>
          <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Total Yield</div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(summary.totalYield)}
          </div>
        </Card>

        <Card className="glass-card card-hover p-6 border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-20 w-20 text-emerald-500 -mr-6 -mt-6" />
          </div>
          <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Claimed</div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">
            {formatCurrency(summary.totalClaimed)}
          </div>
          <div className="text-xs text-muted-foreground mt-2 font-medium">
            {summary.claimedCount} distributions processed
          </div>
        </Card>

        <Card className="glass-card card-hover p-6 border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <div className="h-20 w-20 bg-solar-500 rounded-full blur-3xl -mr-10 -mt-10" />
          </div>
          <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Available</div>
          <div className="text-3xl font-bold text-solar-400 tracking-tight">
            {formatCurrency(summary.totalPending || 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-2 font-medium">
            {summary.pendingCount} pending claims
          </div>
        </Card>

        <Card className="glass-card flex items-center justify-center p-6 border-none">
          <Button
            onClick={handleClaimAll}
            disabled={!summary.pendingCount || batchClaiming}
            className="w-full h-12 bg-solar-500 hover:bg-solar-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95"
          >
            {batchClaiming
              ? "Claiming..."
              : `Claim All Available`}
          </Button>
        </Card>
      </div>

      {/* Pending Claims */}
      {summary.pendingClaims.length > 0 && (
        <Card className="glass-card p-8 border-none space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-solar-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <h2 className="text-xl font-bold text-white tracking-tight">Pending Distributions</h2>
          </div>
          <div className="grid gap-4">
            {summary.pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/[0.08] transition-all"
              >
                <div className="space-y-1">
                  <div className="font-bold text-white group-hover:text-solar-400 transition-colors">
                    {claim.distribution.project.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {claim.distribution.project.location} •{" "}
                    {formatDate(claim.distribution.period)}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-bold text-lg text-solar-400">
                      +{formatCurrency(claim.amount)}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleClaimSingle(claim.id)}
                    disabled={claiming === claim.id}
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-none rounded-lg h-9 px-4"
                  >
                    {claiming === claim.id ? "Processing..." : "Claim Now"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Claims */}
      {summary.recentClaims.length > 0 && (
        <Card className="glass-card p-8 border-none space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h2 className="text-xl font-bold text-white tracking-tight">History</h2>
          </div>
          <div className="grid gap-4">
            {summary.recentClaims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl"
              >
                <div className="space-y-1">
                  <div className="font-bold text-white">
                    {claim.distribution.project.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {claim.distribution.project.location} •{" "}
                    {formatDate(claim.distribution.period)}
                  </div>
                  {claim.claimedAt && (
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-widest">
                      Confirmed {formatDate(claim.claimedAt)}
                    </div>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <div className="font-bold text-emerald-400">
                    {formatCurrency(claim.amount)}
                  </div>
                  {claim.txHash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${claim.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-stellar-400 hover:text-stellar-300 transition-colors uppercase tracking-widest flex items-center gap-1 justify-end"
                    >
                      Stellar Explorer
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {summary.pendingClaims.length === 0 &&
        summary.recentClaims.length === 0 && (
          <Card className="glass-card p-20 text-center border-none">
            <div className="max-w-md mx-auto space-y-4">
              <Sun className="h-16 w-16 text-muted-foreground/20 mx-auto" />
              <div className="space-y-2">
                <div className="text-xl font-bold text-white">Generating Activity...</div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your yields will manifest here as your solar assets begin generating clean energy and revenue.
                </p>
              </div>
            </div>
          </Card>
        )}
    </div>
  );
}
