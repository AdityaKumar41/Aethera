"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import {
  Sun,
  Store,
  Building2,
  Coins,
  Vote,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Shield,
} from "lucide-react";

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "portfolio", label: "Portfolio", icon: Sun },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "projects", label: "My Projects", icon: Building2 },
  { id: "yield", label: "Yield & Rewards", icon: Coins },
  { id: "governance", label: "Governance", icon: Vote },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
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
            Solar
          </span>
        </div>
      </div>

      {/* Wallet Status */}
      <div className={cn(
        "px-3 py-3 border-b border-sidebar-border",
        collapsed && "px-2"
      )}>
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50",
          collapsed && "justify-center px-2"
        )}>
          <div className="w-8 h-8 rounded-lg gradient-energy flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Wallet</p>
              <p className="text-sm font-medium text-foreground truncate">0x1a2b...3c4d</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1.5 mt-2 px-3">
            <Shield className="w-3.5 h-3.5 text-success" />
            <span className="text-xs text-success font-medium">KYC Verified</span>
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
