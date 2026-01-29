"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
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

// Investor navigation items
const investorNavItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "portfolio", label: "Portfolio", icon: Sun },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "projects", label: "My Investments", icon: Building2 },
  { id: "yield", label: "Yield & Rewards", icon: Coins },
  { id: "settings", label: "Settings", icon: Settings },
];

// Installer navigation items
const installerNavItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "my-projects", label: "My Projects", icon: FolderOpen },
  { id: "new-project", label: "Submit Project", icon: Plus },
  { id: "production", label: "Production", icon: Zap },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "settings", label: "Settings", icon: Settings },
];

// Admin navigation items
const adminNavItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "admin-stats", label: "Overview", icon: Sun },
  { id: "admin-projects", label: "Project Approvals", icon: Building2 },
  { id: "admin-kyc", label: "KYC Review", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
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
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
  userRole = "INVESTOR",
  walletAddress,
  kycStatus,
  userName,
}: SidebarProps) {
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
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 gradient-solar shadow-lg shadow-orange-500/20">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <span
            className={cn(
              "font-semibold text-lg text-sidebar-foreground whitespace-nowrap transition-all duration-300",
              collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            )}
          >
            Aethera
          </span>
        </div>
      </div>

      {/* User & Wallet Info */}
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
                : userRole === "ADMIN"
                ? "bg-purple-100 text-purple-700"
                : "bg-emerald-100 text-emerald-700"
            )}>
              {userRole === "INSTALLER" ? "Installer" : userRole === "ADMIN" ? "Admin" : "Investor"}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
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
            </button>
          );
        })}
      </nav>

      {/* Back to Home */}
      <div className={cn(
        "px-3 py-2 border-t border-sidebar-border",
        collapsed && "px-2"
      )}>
        <a
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
        </a>
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

      {/* Collapse button */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
