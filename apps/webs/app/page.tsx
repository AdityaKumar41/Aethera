"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { Loader2, Sun, ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const { isComplete, role, loading } = useOnboardingStatus();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isComplete) {
      if (role === "INSTALLER") {
        router.push("/dashboard/my-projects");
      } else if (role === "ADMIN") {
        router.push("/dashboard/admin-stats");
      } else {
        router.push("/dashboard/portfolio");
      }
    }
  }, [loading, isComplete, role, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-solar flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <Sun className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show loading while redirecting
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-solar flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <Sun className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-amber-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-solar flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Aethera</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Powered by Stellar Blockchain
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Solar Energy
            </span>
            <br />
            Investment Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Invest in tokenized solar energy projects. Earn sustainable yields while powering the green energy revolution.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-4 bg-foreground text-background text-lg font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Start Investing
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-8 py-4 bg-zinc-100 text-foreground text-lg font-medium rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-5xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl gradient-solar flex items-center justify-center mb-4">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Real Solar Projects</h3>
            <p className="text-muted-foreground">
              Invest in verified solar installations with transparent energy production tracking.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl gradient-energy flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sustainable Yields</h3>
            <p className="text-muted-foreground">
              Earn returns from actual energy production, distributed automatically via smart contracts.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl gradient-investment flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure & Compliant</h3>
            <p className="text-muted-foreground">
              KYC-verified investors, regulated tokens, and enterprise-grade security on Stellar.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
