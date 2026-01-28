"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Sun,
  History,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const role = (user?.publicMetadata?.role as string) || "INVESTOR";

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: role === "INSTALLER" ? "/installer" : "/dashboard",
    },
    {
      label: role === "INSTALLER" ? "My Projects" : "Marketplace",
      icon: Sun,
      href: role === "INSTALLER" ? "/installer" : "/dashboard/marketplace",
    },
    {
      label: "History",
      icon: History,
      href: "/dashboard/history",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-white/70 backdrop-blur-xl border-r border-zinc-200 z-20">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <Sun className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Solar
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
                  }`}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "" : "group-hover:text-primary transition-colors"}`}
                />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserButton
                appearance={{ elements: { avatarBox: "h-10 w-10" } }}
              />
              <div className="flex flex-col">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {user?.fullName || user?.firstName || "User"}
                </p>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider italic">
                  {role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-72 min-h-screen transition-all duration-300">
        {/* Header - Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white/70 backdrop-blur-xl border-b border-zinc-200 sticky top-0 z-40">
          <Link href="/" className="flex items-center gap-2">
            <Sun className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight text-glow">
              Solar
            </span>
          </Link>
        </header>

        <div className="container mx-auto p-6 md:p-12 pb-24">{children}</div>
      </main>

      {/* Glass navigation for mobile could be added here if needed */}
    </div>
  );
}
