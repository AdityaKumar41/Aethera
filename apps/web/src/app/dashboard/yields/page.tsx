"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Yields</h1>
        <p className="text-gray-600 mt-2">
          Track and claim your investment yields
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm text-gray-600">Total Yield</div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(summary.totalYield)}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Claimed</div>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(summary.totalClaimed)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.claimedCount} distributions
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {formatCurrency(summary.totalPending)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.pendingCount} available
          </div>
        </Card>
        <Card className="p-6 flex items-center justify-center">
          <Button
            onClick={handleClaimAll}
            disabled={!summary.pendingCount || batchClaiming}
            className="w-full"
            size="lg"
          >
            {batchClaiming
              ? "Claiming..."
              : `Claim All (${summary.pendingCount})`}
          </Button>
        </Card>
      </div>

      {/* Pending Claims */}
      {summary.pendingClaims.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Claims</h2>
          <div className="space-y-3">
            {summary.pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-semibold">
                    {claim.distribution.project.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {claim.distribution.project.location} •{" "}
                    {formatDate(claim.distribution.period)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-blue-600">
                      {formatCurrency(claim.amount)}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleClaimSingle(claim.id)}
                    disabled={claiming === claim.id}
                    size="sm"
                  >
                    {claiming === claim.id ? "Claiming..." : "Claim"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Claims */}
      {summary.recentClaims.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Claims</h2>
          <div className="space-y-3">
            {summary.recentClaims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-semibold">
                    {claim.distribution.project.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {claim.distribution.project.location} •{" "}
                    {formatDate(claim.distribution.period)}
                  </div>
                  {claim.claimedAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      Claimed on {formatDate(claim.claimedAt)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {formatCurrency(claim.amount)}
                  </div>
                  {claim.txHash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${claim.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View Transaction
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
          <Card className="p-12 text-center">
            <div className="text-gray-500">
              <div className="text-lg font-semibold mb-2">No yields yet</div>
              <p>
                Your yields will appear here once projects start generating
                revenue.
              </p>
            </div>
          </Card>
        )}
    </div>
  );
}
