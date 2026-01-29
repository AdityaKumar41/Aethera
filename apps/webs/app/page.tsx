"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { PortfolioSection } from "@/components/dashboard/sections/portfolio";
import { MarketplaceSection } from "@/components/dashboard/sections/marketplace";
import { ProjectsSection } from "@/components/dashboard/sections/projects";
import { YieldSection } from "@/components/dashboard/sections/yield";
import { GovernanceSection } from "@/components/dashboard/sections/governance";
import { SettingsSection } from "@/components/dashboard/sections/settings";

export type Section = "portfolio" | "marketplace" | "projects" | "yield" | "governance" | "settings";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>("portfolio");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case "portfolio":
        return <PortfolioSection />;
      case "marketplace":
        return <MarketplaceSection />;
      case "projects":
        return <ProjectsSection />;
      case "yield":
        return <YieldSection />;
      case "governance":
        return <GovernanceSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <PortfolioSection />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ${sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
          }`}
      >
        <Header activeSection={activeSection} />
        <main className="flex-1 p-6 overflow-auto">
          <div
            key={activeSection}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
