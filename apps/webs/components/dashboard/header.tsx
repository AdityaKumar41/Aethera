"use client";

import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import { Bell, Search, Wallet, ExternalLink } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  activeSection: Section;
}

const sectionTitles: Record<Section, string> = {
  portfolio: "Portfolio Overview",
  marketplace: "Solar Marketplace",
  projects: "My Solar Projects",
  yield: "Yield & Rewards",
  governance: "Governance",
  settings: "Settings",
};

const sectionDescriptions: Record<Section, string> = {
  portfolio: "Track your solar investments and earnings",
  marketplace: "Discover and invest in verified solar projects",
  projects: "Monitor your tokenized solar assets",
  yield: "Claim your earned yields and rewards",
  governance: "Participate in platform decisions",
  settings: "Manage your account and preferences",
};

export function Header({ activeSection }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-foreground">
          {sectionTitles[activeSection]}
        </h1>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {sectionDescriptions[activeSection]}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className={cn(
            "relative flex items-center transition-all duration-300 hidden md:flex",
            searchFocused ? "w-64" : "w-48"
          )}
        >
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent transition-all duration-200"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
        </button>

        {/* Wallet button */}
        <button className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-sm font-medium text-foreground transition-all duration-200">
          <Wallet className="w-4 h-4" />
          <span>0x1a2b...3c4d</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
        </button>

        {/* User avatar */}
        <button className="w-9 h-9 rounded-xl overflow-hidden bg-secondary ring-2 ring-transparent hover:ring-accent/50 transition-all duration-200">
          <div className="w-full h-full gradient-energy flex items-center justify-center text-xs font-semibold text-white">
            AE
          </div>
        </button>
      </div>
    </header>
  );
}
