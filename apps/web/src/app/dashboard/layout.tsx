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
    { href: "/dashboard/oracle", label: "Oracle Data", icon: TrendingUp },
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
      <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-zinc-200 flex flex-col z-20">
        <div className="p-6 border-b border-zinc-200">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-solar-500/10 group-hover:bg-solar-500/20 transition-colors">
              <Sun className="h-6 w-6 text-solar-500" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Solar
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-4 h-11 px-4 transition-all duration-200",
                    isActive
                      ? "bg-solar-500/10 text-solar-600 font-medium"
                      : "text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-solar-500" : "text-current")} />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-1 h-4 rounded-full bg-solar-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9 ring-1 ring-zinc-200 group-hover:ring-solar-500/50 transition-all",
                },
              }}
            />
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-sm font-medium text-foreground truncate leading-tight">
                {user.fullName || user.firstName}
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">
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
