import { ArrowUpRight, ArrowRight } from "lucide-react";
import { AnimatedRevenueChart } from "./animated-revenue-chart";

export function CTASection() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[20vw] font-bold font-sans tracking-tighter leading-none text-zinc-100 whitespace-nowrap">
          RENEWABLE
        </span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-normal leading-tight max-w-4xl mx-auto mb-6 font-sans">
            Ready to fund the future?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
            Join the Aethera network and help bridge the $350B global financing
            gap for renewable energy.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://aethera-webs.vercel.app"
              className="relative flex items-center justify-center gap-0 bg-foreground text-background rounded-full pl-6 pr-1.5 py-1.5 transition-all duration-300 group overflow-hidden"
            >
              <span className="text-sm pr-4">Invest Now</span>
              <span className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-foreground" />
              </span>
            </a>

            <a
              href="https://aethera-webs.vercel.app"
              className="relative flex items-center justify-center gap-0 border border-border rounded-full pl-6 pr-1.5 py-1.5 transition-all duration-300 group overflow-hidden"
            >
              <span className="absolute inset-0 bg-foreground rounded-full scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300" />
              <span className="text-sm text-foreground group-hover:text-background pr-4 relative z-10 transition-colors duration-300">
                Get Funding
              </span>
              <span className="w-10 h-10 rounded-full flex items-center justify-center relative z-10">
                <ArrowRight className="w-4 h-4 text-foreground group-hover:opacity-0 absolute transition-opacity duration-300" />
                <ArrowUpRight className="w-4 h-4 text-foreground group-hover:text-background opacity-0 group-hover:opacity-100 transition-all duration-300" />
              </span>
            </a>
          </div>
        </div>

        <div className="flex justify-center mb-16">
          <AnimatedRevenueChart />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-16">
          <div className="text-center">
            <p className="text-7xl font-light text-foreground">10K+</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Global Investors
            </p>
          </div>
          <div className="text-center">
            <p className="text-7xl font-light text-foreground">25+</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Solar Assets
            </p>
          </div>
          <div className="text-center">
            <p className="text-7xl font-light text-foreground">$1.2B+</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Project Pipeline
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
