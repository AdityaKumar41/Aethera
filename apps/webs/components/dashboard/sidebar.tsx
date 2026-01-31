"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sun,
  Store,
  Building2,
  Coins,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Shield,
  Plus,
  FolderOpen,
  DollarSign,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { useKyc } from "@/hooks/use-dashboard-data";
import { toast } from "sonner";

const investorNavItems = [
  { id: "portfolio", label: "Portfolio", icon: Sun, href: "/dashboard/portfolio" },
  { id: "marketplace", label: "Marketplace", icon: Store, href: "/dashboard/marketplace" },
  { id: "projects", label: "My Investments", icon: Building2, href: "/dashboard/my-investments" },
  { id: "yield", label: "Yield & Rewards", icon: Coins, href: "/dashboard/yield" },
  { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const installerNavItems = [
  { id: "my-projects", label: "My Projects", icon: FolderOpen, href: "/dashboard/my-projects" },
  { id: "new-project", label: "Submit Project", icon: Plus, href: "/dashboard/new-project" },
  { id: "production", label: "Production", icon: Zap, href: "/dashboard/production" },
  { id: "revenue", label: "Revenue", icon: DollarSign, href: "/dashboard/revenue" },
  { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const adminNavItems = [
  { id: "admin-stats", label: "Overview", icon: Sun, href: "/dashboard/admin-stats" },
  { id: "admin-projects", label: "Project Approvals", icon: Building2, href: "/dashboard/admin-projects" },
  { id: "admin-kyc", label: "KYC Review", icon: Shield, href: "/dashboard/admin-kyc" },
  { id: "admin-relayer", label: "Relayer Wallet", icon: Wallet, href: "/dashboard/admin-relayer" },
  { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  userRole?: "INVESTOR" | "INSTALLER" | "ADMIN" | null;
  walletAddress?: string | null;
  kycStatus?: string | null;
  userName?: string | null;
}

function truncateAddress(address: string | null | undefined): string {
  if (!address) return "Not connected";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  userRole = "INVESTOR",
  walletAddress,
  kycStatus,
}: SidebarProps) {
  const { status: liveKycStatus } = useKyc();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  let navItems = investorNavItems;
  if (userRole === "INSTALLER") navItems = installerNavItems;
  if (userRole === "ADMIN") navItems = adminNavItems;

  const displayKycStatus = liveKycStatus?.status || kycStatus;

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Address copied");
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-zinc-200 transition-all duration-300 ease-out flex flex-col",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center px-4 border-b border-zinc-200 relative">
        <Link href="/dashboard/portfolio" className="flex items-center">
          <div className={cn(
            "flex items-center justify-center transition-all duration-300",
            collapsed ? "w-9 h-9" : "w-32 h-10"
          )}>
            <img 
              src="/image.png" 
              alt="Aethera" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </Link>
        
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            "absolute -right-3 top-6 w-6 h-6 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm z-50 transition-all duration-300 hover:scale-110",
            collapsed && "right-[-12px]"
          )}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* User & Wallet Info */}
      {userRole !== "ADMIN" && (
        <div className={cn(
          "px-3 py-3 border-b border-zinc-200",
          collapsed && "px-2"
        )}>
          {/* Wallet Card */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-50",
            collapsed && "justify-center px-2"
          )}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stellar Wallet</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-zinc-900 truncate">
                    {truncateAddress(walletAddress)}
                  </p>
                  {walletAddress && (
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 rounded hover:bg-zinc-200 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-1.5">
                {displayKycStatus === "VERIFIED" ? (
                   <div className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Verified</span>
                   </div>
                ) : displayKycStatus === "IN_REVIEW" ? (
                   <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">In Review</span>
                   </div>
                ) : (
                   <div className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">KYC Pending</span>
                   </div>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                userRole === "INSTALLER" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
              )}>
                {userRole}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (pathname === "/dashboard" && item.id === "portfolio");

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-zinc-100 text-zinc-900 border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-emerald-500" />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-all duration-200",
                  isActive ? "text-emerald-600" : "group-hover:scale-110"
                )}
              />
              {!collapsed && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Network Status Area */}
      {!collapsed && (
        <div className="p-4 border-t border-zinc-200">
           <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50">
              <span className="relative flex h-2 w-2">
                 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                 <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stellar Testnet</span>
           </div>
        </div>
      )}
    </aside>
  );
}
