"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock,
  Plus,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

interface Transaction {
  id: string;
  hash: string;
  created_at: string;
  source_account: string;
  fee_charged: string;
  memo: string;
  successful: boolean;
}

interface WalletInfo {
  publicKey: string;
  balances: Array<{
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    balance: string;
  }>;
  funded: boolean;
}

export function UserWalletSection() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [funding, setFunding] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchWalletData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [walletRes, txRes] = await Promise.all([
        apiRequest<WalletInfo>("/api/users/wallet/balances"),
        apiRequest<Transaction[]>("/api/users/wallet/transactions")
      ]);

      if (walletRes.success && walletRes.data) setWalletInfo(walletRes.data);
      if (txRes.success && txRes.data) setTransactions(txRes.data);
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
      toast.error("Failed to load wallet information");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleCopyAddress = () => {
    if (walletInfo?.publicKey) {
      navigator.clipboard.writeText(walletInfo.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Address copied to clipboard");
    }
  };

  const handleFund = async () => {
    setFunding(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>("/api/users/wallet/fund/friendbot", {
        method: "POST"
      });
      if (res.success) {
        toast.success(res.message);
        await fetchWalletData(true);
      }
    } catch (error) {
      toast.error("Funding failed. Please try again later.");
    } finally {
      setFunding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
        <p className="text-muted-foreground animate-pulse">Synchronizing with Stellar Ledger...</p>
      </div>
    );
  }

  const xlmBalance = walletInfo?.balances.find(b => b.asset_type === "native")?.balance || "0.00";
  const usdcBalance = walletInfo?.balances.find(b => b.asset_code === "USDC")?.balance || "0.00";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
            Stellar Wallet
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Manage your digital assets and track transaction history.
          </p>
        </div>
        <button
          onClick={() => fetchWalletData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-all duration-200 border border-sidebar-border group"
        >
          <RefreshCw className={cn("w-4 h-4 transition-transform duration-500", refreshing && "animate-spin")} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Wallet Address Card */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl transition-opacity group-hover:opacity-100 opacity-50" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl gradient-energy flex items-center justify-center shadow-lg">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Main Wallet</h3>
                    <p className="text-sm text-zinc-400">Horizon Account Activity</p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border animate-pulse",
                  walletInfo?.funded 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {walletInfo?.funded ? "Active on Ledger" : "Requires Minimum Balance"}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Public Address</label>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/3 border border-white/10 group/address">
                  <code className="flex-1 text-sm md:text-base font-mono text-zinc-300 break-all leading-relaxed">
                    {walletInfo?.publicKey || "Not configured"}
                  </code>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopyAddress}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                      title="Copy Address"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {walletInfo?.publicKey && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/account/${walletInfo.publicKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                        title="View on Explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {!walletInfo?.funded && (
                <div className="mt-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-tight">Account Inactive</h4>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Your Stellar account hasn't been funded yet. To use the network, you need a minimum balance of 1 XLM.
                    </p>
                    <button
                      onClick={handleFund}
                      disabled={funding}
                      className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                      {funding ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Plus className="w-4 h-4" />}
                      Fund from Friendbot
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Balance Cards Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative group overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/50 p-6 transition-all hover:bg-zinc-900/80">
              <div className="absolute top-0 right-0 p-4">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-orange-500/20 shadow-lg">
                  <ArrowUpRight className="w-4 h-4 text-orange-500" />
                </div>
              </div>
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-2">Native Asset</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white tracking-tighter">{Number(xlmBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-xl font-medium text-orange-500">XLM</span>
              </div>
              <p className="text-xs text-emerald-500 font-medium mt-4">Stellar Lumens</p>
            </div>

            <div className="relative group overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/50 p-6 transition-all hover:bg-zinc-900/80">
              <div className="absolute top-0 right-0 p-4">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-blue-500/20 shadow-lg">
                  <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                </div>
              </div>
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-2">Stable Asset</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white tracking-tighter">{Number(usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-xl font-medium text-blue-500">USDC</span>
              </div>
              <p className="text-xs text-blue-400 font-medium mt-4">Stellar-native USDC</p>
            </div>
          </div>
        </div>

        {/* Recent Transactions Column */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="flex-1 rounded-3xl border border-white/5 bg-zinc-900/30 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
               History
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-zinc-500 border border-white/10 uppercase tracking-wider">Latest 10</span>
            </h3>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <div 
                    key={tx.id}
                    className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all cursor-default"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                        tx.successful 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                          : "bg-rose-500/5 border-rose-500/20 text-rose-500"
                      )}>
                        {tx.successful ? <ArrowUpRight className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-200 truncate max-w-[120px]">
                            {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
                          </p>
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-accent"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(tx.created_at).toLocaleString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-medium text-emerald-400">{tx.successful ? "Success" : "Failed"}</p>
                       <p className="text-[10px] text-zinc-600 mt-1 font-mono">{tx.fee_charged} XLM Fee</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                    <Clock className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-sm text-zinc-500 font-medium">No activity recorded yet</p>
                  <p className="text-xs text-zinc-600 mt-2">Transactions on the ledger will appear here in real-time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
