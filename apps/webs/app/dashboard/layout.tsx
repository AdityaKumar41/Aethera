"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { useKyc } from "@/hooks/use-dashboard-data";
import { Loader2 } from "lucide-react";
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
  const { isComplete, role, loading, walletAddress, user, kycStatus: initialKycStatus } = useOnboardingStatus();
  const { status: liveKycStatus } = useKyc();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Use live KYC status from hook if available, otherwise fallback to initial status from onboarding
  const currentKycStatus = liveKycStatus?.status || initialKycStatus;

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-100/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-emerald-100/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-8">
            <div className="w-56 h-14 flex items-center justify-center animate-pulse-slow">
              <img 
                src="/image.png" 
                alt="Aethera" 
                className="w-full h-full object-contain filter drop-shadow-2xl"
              />
            </div>
            <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-3xl -z-10 animate-pulse" />
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600/50" />
              <p className="text-[10px] text-muted-foreground font-bold tracking-[0.3em] uppercase opacity-40">
                Initializing Secure Session
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
