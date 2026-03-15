"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { ShieldX, Loader2 } from "lucide-react";

type AllowedRole = "INVESTOR" | "INSTALLER" | "ADMIN";

interface RoleGuardProps {
  allowedRoles: AllowedRole[];
  children: React.ReactNode;
}

const roleDefaultRoute: Record<AllowedRole, string> = {
  ADMIN: "/dashboard/admin-stats",
  INSTALLER: "/dashboard/my-projects",
  INVESTOR: "/dashboard/portfolio",
};

/**
 * RoleGuard component that wraps pages requiring specific roles.
 * If the user's role is not in the allowedRoles list, it shows an
 * "Access Denied" message and redirects them to their default dashboard.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { role, loading } = useOnboardingStatus();
  const router = useRouter();

  const hasAccess = role && allowedRoles.includes(role as AllowedRole);

  useEffect(() => {
    if (!loading && role && !hasAccess) {
      const redirect =
        roleDefaultRoute[role as AllowedRole] || "/dashboard/portfolio";
      const timer = setTimeout(() => {
        router.push(redirect);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, role, hasAccess, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Verifying access...
        </span>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-zinc-900">Access Denied</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            You do not have permission to access this page. Your role (
            {role || "unknown"}) is not authorized for this section. Redirecting
            you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
