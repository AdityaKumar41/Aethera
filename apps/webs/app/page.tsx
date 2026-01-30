"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { Loader2, Sun, ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isComplete, role, loading } = useOnboardingStatus();

  // Redirect authenticated users based on their onboarding status
  useEffect(() => {
    if (!clerkLoaded || loading) return;

    // If user is authenticated with Clerk
    if (clerkUser) {
      if (isComplete) {
        // User completed onboarding, redirect to their dashboard
        if (role === "INSTALLER") {
          router.push("/dashboard/my-projects");
        } else if (role === "ADMIN") {
          router.push("/dashboard/admin-stats");
        } else {
          router.push("/dashboard/portfolio");
        }
      } else {
        // User is authenticated but hasn't completed onboarding
        router.push("/onboarding");
      }
    } else {
      // Not authenticated, send to sign-in
      router.push("/sign-in");
    }
  }, [clerkLoaded, clerkUser, loading, isComplete, role, router]);

  // Placeholder loading state while determining redirection
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-emerald-100/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-8">
          <div className="w-56 h-14 flex items-center justify-center animate-pulse-slow">
            <img 
              src="/image.png" 
              alt="Aethera" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-3xl -z-10 animate-pulse" />
        </div>
        
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600/50" />
            <p className="text-[10px] text-muted-foreground font-bold tracking-[0.3em] uppercase opacity-40">
              {clerkUser ? 'Redirecting to Dashboard...' : 'Authenticating...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
