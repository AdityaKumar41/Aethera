"use client";

import { cn } from "@/lib/utils";
import type { Section } from "@/lib/types";
import { Bell, Search, Wallet, Copy, Check } from "lucide-react";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";

interface HeaderProps {
  activeSection: Section;
  userRole?: "INVESTOR" | "INSTALLER" | "ADMIN" | null;
  walletAddress?: string | null;
}

const titles: Record<string, string> = {
  portfolio: "Portfolio Overview",
  marketplace: "Aethera Marketplace",
  projects: "My Investments",
  yield: "Yield & Rewards",
  settings: "Settings",
  "my-projects": "My Projects",
  "new-project": "Submit New Project",
  revenue: "Revenue",
  "admin-stats": "Platform Overview",
  "admin-projects": "Project Approvals",
  "admin-kyc": "KYC Review Queue",
  "admin-relayer": "Relayer Wallet Management",
};

const descriptions: Record<string, string> = {
  portfolio: "Track your solar investments and earnings",
  marketplace: "Discover and invest in verified solar projects",
  projects: "Monitor your tokenized solar assets",
  yield: "Claim your earned yields and rewards",
  settings: "Manage your account and preferences",
  "my-projects": "Manage your solar projects and track funding",
  "new-project": "Submit a new solar project for financing",
  revenue: "Track revenue and yield distributions",
  "admin-stats": "Monitor platform-wide investment activity",
  "admin-projects": "Review and approve pending solar projects",
  "admin-kyc": "Manage user verification and compliance",
  "admin-relayer": "Monitor and fund the admin relayer wallet",
};

function truncateAddress(address: string | null | undefined): string {
  if (!address) return "No wallet";
  if (address.length < 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function Header({ activeSection, userRole = "INVESTOR", walletAddress }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-foreground">
          {titles[activeSection] || "Dashboard"}
        </h1>
        <p className="text-xs text-zinc-500 hidden sm:block">
          {descriptions[activeSection] || ""}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className={cn(
            "relative items-center transition-all duration-300 hidden md:flex",
            searchFocused ? "w-64" : "w-48"
          )}
        >
          <Search className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </button>

        {userRole !== "ADMIN" && (
          <button 
            onClick={handleCopyAddress}
            className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-sm font-medium text-foreground transition-all duration-200 group"
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span className="font-mono text-xs">{truncateAddress(walletAddress)}</span>
            {walletAddress && (
              copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
              )
            )}
          </button>
        )}

        <UserButton 
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "w-9 h-9 rounded-xl"
            }
          }}
        />
      </div>
    </header>
  );
}
