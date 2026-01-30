import React from "react"
import { Sun } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 relative overflow-hidden p-6">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-emerald-100/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-48 h-12 flex items-center justify-center mb-2 animate-pulse-slow">
            <img 
              src="/image.png" 
              alt="Aethera" 
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-60">
            Solar Investment Ecosystem
          </p>
        </div>

        <div className="w-full bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl shadow-zinc-200/50 p-2">
          <div className="bg-white rounded-[22px] p-6 shadow-sm">
            {children}
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-muted-foreground font-medium tracking-wide uppercase opacity-60">
          Secure Identity via Clerk
        </p>
      </div>
    </div>
  )
}
