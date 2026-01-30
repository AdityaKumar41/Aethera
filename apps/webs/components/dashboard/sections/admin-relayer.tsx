"use client";

import { useState, useEffect } from "react";
import { 
  Wallet, 
  RefreshCw, 
  DollarSign, 
  Activity, 
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

interface RelayerWalletInfo {
  publicKey: string;
  xlmBalance: string;
  usdcBalance: string;
  isActive: boolean;
}

interface RelayerTransaction {
  hash: string;
  type: string;
  amount: string;
  timestamp: string;
  status: string;
}

export function AdminRelayerSection() {
  const [walletInfo, setWalletInfo] = useState<RelayerWalletInfo | null>(null);
  const [transactions, setTransactions] = useState<RelayerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchWalletInfo = async () => {
    try {
      const response = await apiRequest<RelayerWalletInfo>("/api/admin/relayer/wallet");
      if (response.success && response.data) {
        setWalletInfo(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch relayer wallet:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await apiRequest<RelayerTransaction[]>("/api/admin/relayer/transactions?limit=10");
      if (response.success && response.data) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  };

  const fundFromFriendbot = async () => {
    setFunding(true);
    try {
      const response = await apiRequest<RelayerWalletInfo>("/api/admin/relayer/fund/friendbot", { method: "POST" });
      if (response.success && response.data) {
        toast.success("Relayer funded from friendbot!");
        setWalletInfo(response.data);
        await fetchTransactions();
      } else {
        toast.error(response.error || "Failed to fund relayer");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fund relayer");
    } finally {
      setFunding(false);
    }
  };

  const copyAddress = () => {
    if (walletInfo?.publicKey) {
      navigator.clipboard.writeText(walletInfo.publicKey);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchWalletInfo(), fetchTransactions()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const xlmBalance = parseFloat(walletInfo?.xlmBalance || "0");
  const isLowBalance = xlmBalance < 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Relayer Wallet</h2>
          <p className="text-zinc-500 mt-1">
            Admin wallet for sponsoring user transactions
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Wallet Card */}
      {walletInfo ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Relayer Address</h3>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-zinc-600 bg-zinc-100 px-2 py-1 rounded font-mono">
                    {walletInfo.publicKey.slice(0, 8)}...{walletInfo.publicKey.slice(-8)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="p-1 hover:bg-zinc-100 rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${walletInfo.publicKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-zinc-100 rounded transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 text-zinc-400" />
                  </a>
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              walletInfo.isActive 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-amber-100 text-amber-700"
            }`}>
              {walletInfo.isActive ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Active
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Inactive
                </>
              )}
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-zinc-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-500">XLM Balance</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isLowBalance ? "text-amber-600" : "text-zinc-900"}`}>
                  {parseFloat(walletInfo.xlmBalance).toFixed(2)}
                </span>
                <span className="text-zinc-400">XLM</span>
              </div>
              {isLowBalance && (
                <p className="text-xs text-amber-600 mt-2">
                  Low balance! Minimum 10 XLM recommended for operations.
                </p>
              )}
            </div>

            <div className="p-4 bg-zinc-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-500">USDC Balance</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-zinc-900">
                  {parseFloat(walletInfo.usdcBalance).toFixed(2)}
                </span>
                <span className="text-zinc-400">USDC</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={fundFromFriendbot}
              disabled={funding}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {funding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Funding...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4" />
                  Fund from Friendbot (Testnet)
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              <span className="text-zinc-500">Loading wallet info...</span>
            </div>
          ) : (
            <>
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-semibold text-zinc-900 mb-2">
                Relayer Wallet Not Configured
              </h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                Set <code className="bg-zinc-100 px-1.5 py-0.5 rounded">ADMIN_RELAYER_PUBLIC_KEY</code> and{" "}
                <code className="bg-zinc-100 px-1.5 py-0.5 rounded">ADMIN_RELAYER_SECRET_ENCRYPTED</code> in your API environment.
              </p>
            </>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <h3 className="font-semibold text-zinc-900 mb-4">Recent Transactions</h3>
        
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    tx.status === "success" 
                      ? "bg-emerald-100" 
                      : tx.status === "failed" 
                        ? "bg-red-100" 
                        : "bg-amber-100"
                  }`}>
                    {tx.status === "success" ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : tx.status === "failed" ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                    )}
                  </div>
                  <div>
                    <code className="text-sm text-zinc-700 font-mono">
                      {tx.hash.slice(0, 12)}...{tx.hash.slice(-8)}
                    </code>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-zinc-900">
                    {(parseInt(tx.amount) / 10000000).toFixed(4)} XLM
                  </span>
                  <p className="text-xs text-zinc-400 capitalize">{tx.type}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-400 text-center py-8">
            No transactions yet
          </p>
        )}
      </div>
    </div>
  );
}
