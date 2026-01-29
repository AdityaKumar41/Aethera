"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { PortfolioSection } from "@/components/dashboard/sections/portfolio";
import { MarketplaceSection } from "@/components/dashboard/sections/marketplace";
import { ProjectsSection } from "@/components/dashboard/sections/projects";
import { YieldSection } from "@/components/dashboard/sections/yield";
import { SettingsSection } from "@/components/dashboard/sections/settings";
import { InstallerProjectsSection } from "@/components/dashboard/sections/installer-projects";
import { NewProjectSection } from "@/components/dashboard/sections/new-project";
import { ProductionSection } from "@/components/dashboard/sections/production";
import { AdminProjectsSection } from "@/components/dashboard/sections/admin-projects";
import { AdminKYCSection } from "@/components/dashboard/sections/admin-kyc";
import { AdminStatsSection } from "@/components/dashboard/sections/admin-stats";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { Loader2, Sun } from "lucide-react";

// Investor sections
export type InvestorSection = "portfolio" | "marketplace" | "projects" | "yield" | "settings";

// Installer sections
export type InstallerSection = "my-projects" | "new-project" | "production" | "revenue" | "settings";

// Admin sections
export type AdminSection = "admin-stats" | "admin-projects" | "admin-kyc" | "settings";

export type Section = InvestorSection | InstallerSection | AdminSection;

export default function Dashboard() {
  const router = useRouter();
  const { isComplete, role, loading, walletAddress, kycStatus, user } = useOnboardingStatus();
  const [activeSection, setActiveSection] = useState<Section>("portfolio");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect to onboarding if not complete
  useEffect(() => {
    if (!loading && !isComplete) {
      router.push("/onboarding");
    }
  }, [loading, isComplete, router]);

  // Set initial section based on role
  useEffect(() => {
    if (role === "INSTALLER") {
      setActiveSection("my-projects");
    } else if (role === "ADMIN") {
      setActiveSection("admin-stats");
    } else {
      setActiveSection("portfolio");
    }
  }, [role]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-solar flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <Sun className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render while redirecting to onboarding
  if (!isComplete) {
    return null;
  }

  const renderSection = () => {
    // Admin sections
    if (role === "ADMIN") {
      switch (activeSection) {
        case "admin-stats":
          return <AdminStatsSection />;
        case "admin-projects":
          return <AdminProjectsSection />; 
        case "admin-kyc":
          return <AdminKYCSection />;
        case "settings":
          return <SettingsSection />;
        default:
          return <PortfolioSection />;
      }
    }

    // Installer sections
    if (role === "INSTALLER") {
      switch (activeSection) {
        case "my-projects":
          return <InstallerProjectsSection />;
        case "new-project":
          return <NewProjectSection />;
        case "production":
          return <ProductionSection />;
        case "revenue":
          return <YieldSection />;
        case "settings":
          return <SettingsSection />;
        default:
          return <InstallerProjectsSection />;
      }
    }

    // Investor sections (default)
    switch (activeSection) {
      case "portfolio":
        return <PortfolioSection />;
      case "marketplace":
        return <MarketplaceSection />;
      case "projects":
        return <ProjectsSection />;
      case "yield":
        return <YieldSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <PortfolioSection />;
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        userRole={role as "INVESTOR" | "INSTALLER" | null}
        walletAddress={walletAddress}
        kycStatus={kycStatus}
        userName={user?.name}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ${sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
          }`}
      >
        <Header 
          activeSection={activeSection} 
          userRole={role as "INVESTOR" | "INSTALLER" | null} 
          walletAddress={walletAddress}
        />
        <main className="flex-1 p-6 overflow-auto bg-zinc-50/50">
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
