"use client";

import { useWalletBalances, useClaimTokens } from "@/hooks/use-dashboard-data";
import {
  Wallet,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { walletApi } from "@/lib/api";

export function UserWalletSection() {
  const { balances, loading, refetch } = useWalletBalances();
  const claimableBalances = balances?.claimableBalances;
  const { claim, loading: claiming } = useClaimTokens();
  const [isRefetching, setIsRefetching] = useState(false);
  const [activatingWallet, setActivatingWallet] = useState(false);
  const walletFunded = Boolean(balances?.funded);

  const handleRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setTimeout(() => setIsRefetching(false), 800);
    toast.success("Wallet synchronized");
  };

  const handleClaimAll = async () => {
    if (!claimableBalances || claimableBalances.length === 0) return;

    try {
      const result = await claim();
      if (result.success) {
        toast.success("All assets settled successfully");
        refetch();
      } else {
        toast.error("Failed to settle assets");
      }
    } catch {
      toast.error("An error occurred during settlement");
    }
  };

  const handleActivateWallet = async () => {
    setActivatingWallet(true);

    try {
      const response = await walletApi.fundTestnet();
      if (response.success) {
        toast.success(response.message || "Wallet activated on Stellar testnet");
        await refetch();
      } else {
        toast.error(response.error || "Failed to activate wallet");
      }
    } catch {
      toast.error("Failed to activate wallet");
    } finally {
      setActivatingWallet(false);
    }
  };

  const filteredBalances =
    balances?.balances?.filter((b) => {
      const code = b.asset || "XLM";
      return ["USDC", "AETH", "XLM"].includes(code.toUpperCase());
    }) || [];

  const mainBalance =
    balances?.balances?.find((b) => (b.asset || "XLM").toUpperCase() === "USDC")
      ?.balance || "0.00";
  const xlmBalance =
    balances?.balances?.find((b) => !b.asset || b.asset.toUpperCase() === "XLM")
      ?.balance || "0.00";

  if (loading && !balances) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Wallet Overview</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Your on-chain assets on Stellar Testnet.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
        >
          <RefreshCw
            className={cn("w-4 h-4", isRefetching && "animate-spin")}
          />
        </button>
      </div>

      {/* Primary Balance Card */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span
            className={cn(
              "text-xs font-semibold",
              walletFunded ? "text-emerald-600" : "text-amber-600",
            )}
          >
            Stellar Testnet · {walletFunded ? "Active" : "Awaiting Funding"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-zinc-400 mb-1">USDC Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-zinc-900 tabular-nums">
                ${mainBalance}
              </span>
              <span className="text-sm text-zinc-400">USDC</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">XLM Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-zinc-900 tabular-nums">
                {xlmBalance}
              </span>
              <span className="text-sm text-zinc-400">XLM</span>
            </div>
          </div>
        </div>

        {balances?.publicKey && (
          <div className="mt-5 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-400 mb-2">Stellar Address</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-zinc-700 truncate flex-1 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-100">
                {balances.publicKey}
              </code>
              <a
                href={
                  walletFunded
                    ? `https://stellar.expert/explorer/testnet/account/${balances.publicKey}`
                    : undefined
                }
                target={walletFunded ? "_blank" : undefined}
                rel={walletFunded ? "noopener noreferrer" : undefined}
                aria-disabled={!walletFunded}
                onClick={(event) => {
                  if (!walletFunded) {
                    event.preventDefault();
                    toast.info(
                      "This wallet needs its first testnet funding transaction before Stellar Expert can load it.",
                    );
                  }
                }}
                className={cn(
                  "p-2 rounded-lg border transition-colors",
                  walletFunded
                    ? "bg-zinc-50 border-zinc-100 text-zinc-500 hover:text-emerald-600"
                    : "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed",
                )}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      {!walletFunded && balances?.publicKey && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-sm">
                Wallet exists, but the Stellar account is not active yet
              </h3>
              <p className="text-xs text-blue-700 mt-0.5 mb-4">
                The custodial keypair has been created. One Friendbot funding
                transaction is still needed before Stellar Expert and on-chain
                balances become available.
              </p>
              <button
                onClick={handleActivateWallet}
                disabled={activatingWallet}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {activatingWallet ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                Activate Testnet Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claimable Balance Alert */}
      {claimableBalances && claimableBalances.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 text-sm">
                {claimableBalances.length} pending asset{" "}
                {claimableBalances.length === 1 ? "transfer" : "transfers"}
              </h3>
              <p className="text-xs text-amber-700 mt-0.5 mb-4">
                These assets are waiting to be settled into your wallet.
              </p>
              <button
                onClick={handleClaimAll}
                disabled={claiming}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {claiming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                Claim All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Holdings */}
      {filteredBalances.length > 0 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Asset Holdings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBalances.map((asset, idx) => (
              <div
                key={idx}
                className="bg-zinc-50 border border-zinc-100 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-500 uppercase">
                    {asset.asset || "XLM"}
                  </span>
                  {asset.asset && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/asset/${asset.asset}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-emerald-600 transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-lg font-bold text-zinc-900">
                  {asset.balance}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!balances?.publicKey && !loading && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-zinc-400" />
          </div>
          <h3 className="font-semibold text-zinc-900 mb-1">No wallet found</h3>
          <p className="text-sm text-zinc-500">
            Your custodial wallet is created automatically after onboarding.
            Please try refreshing.
          </p>
        </div>
      )}
    </div>
  );
}
