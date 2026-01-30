"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { useKyc } from "@/hooks/use-dashboard-data";
import { Loader2, Sun } from "lucide-react";
import { useState } from "react";

// Map URL paths to section names for header
const pathToSection: Record<string, string> = {
  "/dashboard/portfolio": "portfolio",
  "/dashboard/marketplace": "marketplace",
  "/dashboard/my-investments": "projects",
  "/dashboard/yield": "yield",
  "/dashboard/settings": "settings",
  "/dashboard/my-projects": "my-projects",
  "/dashboard/new-project": "new-project",
  "/dashboard/production": "production",
  "/dashboard/revenue": "revenue",
  "/dashboard/admin-stats": "admin-stats",
  "/dashboard/admin-projects": "admin-projects",
  "/dashboard/admin-kyc": "admin-kyc",
};

// Role-to-routes mapping for authorization
const roleAllowedSections: Record<string, string[]> = {
  INVESTOR: ["portfolio", "marketplace", "projects", "yield", "settings"],
  INSTALLER: ["my-projects", "new-project", "production", "revenue", "settings"],
  ADMIN: ["admin-stats", "admin-projects", "admin-kyc", "admin-relayer", "settings"],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isComplete, role, loading, walletAddress, user } = useOnboardingStatus();
  const { status: liveKycStatus, refetch: refetchKyc } = useKyc();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Use live KYC status from hook if available, otherwise fallback to onboarding status
  const currentKycStatus = liveKycStatus?.status || null;

  // Redirect to onboarding if not complete
  useEffect(() => {
    if (!loading && !isComplete) {
      router.push("/onboarding");
      return;
    }

    if (!loading && isComplete && role) {
      const activeSection = pathToSection[pathname];
      if (activeSection) {
        const allowedSections = roleAllowedSections[role] || [];
        if (!allowedSections.includes(activeSection)) {
          // User is trying to access a restricted section, redirect to their home
          const defaultRedirect = role === "ADMIN" 
            ? "/dashboard/admin-stats" 
            : role === "INSTALLER" 
            ? "/dashboard/my-projects" 
            : "/dashboard/portfolio";
          
          router.push(defaultRedirect);
        }
      }
    }
  }, [loading, isComplete, role, pathname, router]);

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

  // Don't render while redirecting or checking permissions
  const activeSection = pathToSection[pathname];
  const allowedSections = role ? roleAllowedSections[role] : [];
  if (!isComplete || (activeSection && !allowedSections.includes(activeSection))) {
    return null;
  }

  const sectionName = activeSection || "portfolio";

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeSection={sectionName as any}
        onSectionChange={() => {}} // Now using links instead
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        userRole={role as "INVESTOR" | "INSTALLER" | "ADMIN" | null}
        walletAddress={walletAddress}
        kycStatus={currentKycStatus}
        userName={user?.name}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ${
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        }`}
      >
        <Header
          activeSection={sectionName as any}
          userRole={role as "INVESTOR" | "INSTALLER" | "ADMIN" | null}
          walletAddress={walletAddress}
        />
        <main className="flex-1 p-6 overflow-auto bg-zinc-50/50">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
