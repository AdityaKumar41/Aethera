"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import {
  Sun,
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Wallet,
  Settings,
  Building,
  PlusCircle,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      // Check if onboarding is complete
      const onboardingComplete = user.unsafeMetadata?.onboardingComplete;
      if (!onboardingComplete && pathname !== "/onboarding") {
        router.push("/onboarding");
      }
    }
  }, [isLoaded, user, pathname, router]);

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solar-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRole = (user.unsafeMetadata?.role as string) || "INVESTOR";

  // Role-based navigation
  const investorNav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/marketplace", label: "Marketplace", icon: Briefcase },
    { href: "/dashboard/portfolio", label: "Portfolio", icon: TrendingUp },
    { href: "/dashboard/yields", label: "Yields", icon: Wallet },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const installerNav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "My Projects", icon: Building },
    {
      href: "/dashboard/submit-project",
      label: "New Project",
      icon: PlusCircle,
    },
    { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const adminNav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    {
      href: "/dashboard/pending-projects",
      label: "Pending Projects",
      icon: ClipboardCheck,
    },
    { href: "/dashboard/pending-kyc", label: "KYC Review", icon: Users },
    { href: "/dashboard/users", label: "Users", icon: Users },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const navItems =
    userRole === "ADMIN"
      ? adminNav
      : userRole === "INSTALLER"
        ? installerNav
        : investorNav;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <Sun className="h-8 w-8 text-solar-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-solar-500 to-stellar-500 bg-clip-text text-transparent">
              Aethera
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-solar-500/10 text-solar-500",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10",
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {user.fullName || user.firstName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {userRole.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
