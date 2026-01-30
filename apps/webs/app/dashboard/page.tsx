"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { Loader2 } from "lucide-react";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { role, loading, isComplete } = useOnboardingStatus();

  useEffect(() => {
    if (!loading) {
      if (!isComplete) {
        router.push("/onboarding");
        return;
      }

      const defaultRedirect = role === "ADMIN" 
        ? "/dashboard/admin-stats" 
        : role === "INSTALLER" 
        ? "/dashboard/my-projects" 
        : "/dashboard/portfolio";
      
      router.push(defaultRedirect);
    }
  }, [loading, isComplete, role, router]);

  return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
