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
  Home,
  Plus,
  FolderOpen,
  DollarSign,
  AlertCircle,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { useState } from "react";

// Investor navigation items with routes
const investorNavItems = [
  { id: "portfolio", label: "Portfolio", icon: Sun, href: "/dashboard/portfolio" },
  { id: "marketplace", label: "Marketplace", icon: Store, href: "/dashboard/marketplace" },
  { id: "projects", label: "My Investments", icon: Building2, href: "/dashboard/my-investments" },
  { id: "yield", label: "Yield & Rewards", icon: Coins, href: "/dashboard/yield" },
  { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

// Installer navigation items with routes
const installerNavItems = [
  { id: "my-projects", label: "My Projects", icon: FolderOpen, href: "/dashboard/my-projects" },
  { id: "new-project", label: "Submit Project", icon: Plus, href: "/dashboard/new-project" },
  { id: "production", label: "Production", icon: Zap, href: "/dashboard/production" },
  { id: "revenue", label: "Revenue", icon: DollarSign, href: "/dashboard/revenue" },
  { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

// Admin navigation items with routes
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

// Truncate wallet address for display
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
  userName,
}: SidebarProps) {
  const pathname = usePathname();
  
  let navItems = investorNavItems;
  if (userRole === "INSTALLER") navItems = installerNavItems;
  if (userRole === "ADMIN") navItems = adminNavItems;
  
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isKycVerified = kycStatus === "VERIFIED";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border relative">
        <Link href="/dashboard/portfolio" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 gradient-solar shadow-lg shadow-orange-500/20">
            <Sun className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg text-sidebar-foreground whitespace-nowrap transition-all duration-300">
              Aethera
            </span>
          )}
        </Link>
        
        {/* Collapse Toggle - Top Right */}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            "absolute -right-3 top-6 w-6 h-6 bg-white border border-sidebar-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm z-50 transition-all duration-300 hover:scale-110",
            collapsed && "right-[-12px]"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* User & Wallet Info - Hide personal wallet for Admin */}
      {userRole !== "ADMIN" && (
        <div className={cn(
          "px-3 py-3 border-b border-sidebar-border",
          collapsed && "px-2"
        )}>
          {/* Wallet Card */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-lg bg-sidebar-accent/50",
            collapsed && "justify-center px-2"
          )}>
            <div className="w-8 h-8 rounded-lg gradient-energy flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Stellar Wallet</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground truncate">
                    {truncateAddress(walletAddress)}
                  </p>
                  {walletAddress && (
                    <button
                      onClick={handleCopyAddress}
                      className="p-0.5 rounded hover:bg-zinc-200 transition-colors"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KYC & Role Status */}
          {!collapsed && (
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-1.5">
                {isKycVerified ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">KYC Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-amber-600 font-medium">KYC Pending</span>
                  </>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                userRole === "INSTALLER" 
                  ? "bg-blue-100 text-blue-700" 
                  : "bg-emerald-100 text-emerald-700"
              )}>
                {userRole === "INSTALLER" ? "Installer" : "Investor"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Admin specific badge when personal info is hidden */}
      {userRole === "ADMIN" && !collapsed && (
        <div className="px-6 py-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between bg-purple-50 px-3 py-2 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">Administrator</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (pathname === "/dashboard" && item.id === "portfolio") ||
            (pathname === "/dashboard" && userRole === "INSTALLER" && item.id === "my-projects") ||
            (pathname === "/dashboard" && userRole === "ADMIN" && item.id === "admin-stats");

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {/* Active indicator */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-all duration-200",
                  isActive ? "text-accent" : "group-hover:scale-110"
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Back to Home */}
      <div className={cn(
        "px-3 py-2 border-t border-sidebar-border",
        collapsed && "px-2"
      )}>
        <Link
          href="/"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
            "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Home className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
          <span
            className={cn(
              "whitespace-nowrap transition-all duration-300",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}
          >
            Back to Home
          </span>
        </Link>
      </div>

      {/* Network Status */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-muted-foreground">Stellar Testnet</span>
          </div>
        </div>
      )}

    </aside>
  );
}
