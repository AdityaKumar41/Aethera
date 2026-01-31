"use client";

import { useWalletBalances, useClaimTokens } from "@/hooks/use-dashboard-data";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Loader2,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export function UserWalletSection() {
  const { balances, claimableBalances, loading, refetch } = useWalletBalances();
  const { claim, loading: claiming } = useClaimTokens();
  const [isRefetching, setIsRefetching] = useState(false);

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
    } catch (err) {
      toast.error("An error occurred during settlement");
    }
  };

  // Simplified balance list: Show USDC and AETH primarily, hide dust or XLM if requested
  // However, XLM is needed for fees, so we'll show it but de-emphasize it.
  const filteredBalances = balances?.balances?.filter(b => {
      const code = b.asset || "XLM";
      return ["USDC", "AETH", "XLM"].includes(code.toUpperCase());
  }) || [];

  const mainBalance = balances?.balances?.find(b => (b.asset || "XLM").toUpperCase() === "USDC")?.balance || "0.00";
  const aethBalance = balances?.balances?.find(b => b.asset?.toUpperCase() === "AETH")?.balance || "0";

  if (loading && !balances) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Securing Connection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Financial Hub</h2>
          <p className="text-zinc-500 font-medium text-sm">Manage your energy-backed assets and liquidity.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="p-3 rounded-2xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-all active:scale-95"
          >
            <RefreshCw className={cn("w-5 h-5", isRefetching && "animate-spin")} />
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/10 active:scale-95">
            Add Liquidity
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Asset View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Primary Wallet Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative overflow-hidden rounded-4xl bg-white border border-zinc-200 p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-orange-50/50 to-transparent rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Stellar Vault Active
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Liquid Capital</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-zinc-900 tracking-tighter">${mainBalance}</span>
                    <span className="text-lg font-bold text-zinc-400 uppercase tracking-widest">USDC</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-50 border border-zinc-100 p-5 rounded-3xl">
                   <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">AETH Staked</span>
                   </div>
                   <p className="text-2xl font-black text-zinc-900">{aethBalance}</p>
                   <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter italic">Generating Yield</p>
                </div>
                <div className="bg-zinc-50 border border-zinc-100 p-5 rounded-3xl">
                   <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Monthly Growth</span>
                   </div>
                   <p className="text-2xl font-black text-zinc-900">+12.4%</p>
                   <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-tighter italic">Last 30 Days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Asset List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBalances.map((asset, idx) => (
              <div key={idx} className="bg-white border border-zinc-200 rounded-3xl p-5 hover:border-orange-500/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-900 font-black group-hover:bg-zinc-900 group-hover:text-white transition-all">
                    {(asset.asset || "XLM").slice(0, 1)}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{asset.asset || "XLM"}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Asset Code</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-black text-zinc-900">{asset.balance}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Settled</span>
                    <button className="text-zinc-400 hover:text-orange-600 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar / Actions Area */}
        <div className="space-y-6">
          {/* Claimable Balance Notification */}
          {claimableBalances && claimableBalances.length > 0 && (
            <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-4xl p-6 text-white shadow-xl shadow-orange-500/20 space-y-4 animate-in slide-in-from-right-8 duration-500">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-black text-lg italic tracking-tight uppercase leading-none">Settlement Ready</h3>
               </div>
               
               <p className="text-sm font-medium text-white/90 leading-relaxed">
                  We've detected {claimableBalances.length} pending asset transfers in your vault. Secure them now to update your balance.
               </p>

               <button 
                onClick={handleClaimAll}
                disabled={claiming}
                className="w-full py-4 bg-white text-orange-600 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 active:scale-95"
               >
                 {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                   <>
                    Claim All Assets
                    <ChevronRight className="w-3.5 h-3.5" />
                   </>
                 )}
               </button>
            </div>
          )}

          {/* Quick Stats / History Placeholder */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-4xl p-6 space-y-6">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none">Activity Feed</p>
                <button className="text-[9px] font-black text-orange-600 uppercase tracking-widest hover:underline underline-offset-4">View All</button>
             </div>
             
             <div className="space-y-5">
                {[
                  { label: "USDC Received", date: "2m ago", amount: "+500.00", icon: ArrowDownLeft, color: "text-emerald-500", bg: "bg-emerald-50" },
                  { label: "Token Purchase", date: "1h ago", amount: "-100.00", icon: ArrowUpRight, color: "text-orange-500", bg: "bg-orange-50" },
                  { label: "Yield Distributed", date: "4h ago", amount: "+12.45", icon: ArrowDownLeft, color: "text-emerald-500", bg: "bg-emerald-50" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", item.bg)}>
                           <item.icon className={cn("w-4 h-4", item.color)} />
                        </div>
                        <div>
                           <p className="text-xs font-black text-zinc-900 group-hover:text-orange-600 transition-colors uppercase italic">{item.label}</p>
                           <p className="text-[9px] font-bold text-zinc-400 uppercase">{item.date}</p>
                        </div>
                     </div>
                     <p className={cn("text-xs font-black", item.color)}>{item.amount}</p>
                  </div>
                ))}
             </div>
             
             <div className="pt-2">
                <div className="p-4 rounded-2xl bg-white border border-zinc-100 flex items-center justify-between">
                   <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Network Speed</p>
                      <p className="text-xs font-black text-zinc-900 tracking-tight">4.2s Avg Block</p>
                   </div>
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
}
