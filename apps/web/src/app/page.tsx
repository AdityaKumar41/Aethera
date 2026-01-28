import Link from 'next/link';
import { Sun, TrendingUp, Shield, Zap, ArrowRight, Globe, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-200">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Sun className="h-8 w-8 text-solar-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-solar-500 to-solar-400 bg-clip-text text-transparent">
              Solar
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/marketplace">
              <Button variant="ghost">Marketplace</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="solar">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-solar-500/5 via-transparent to-stellar-500/5">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center animate-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-solar-500/10 border border-solar-500/20 mb-6">
              <Zap className="h-4 w-4 text-solar-500" />
              <span className="text-sm font-medium text-solar-500">Powered by Stellar Blockchain</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Finance the{' '}
              <span className="bg-gradient-to-r from-solar-500 to-solar-400 bg-clip-text text-transparent">
                Solar Revolution
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Solar connects solar developers with global investors through tokenized renewable energy assets.
              Earn stable yields while powering a sustainable future.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/register?role=investor">
                <Button variant="solar" size="lg" className="gap-2">
                  Start Investing <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/register?role=installer">
                <Button variant="outline" size="lg">
                  Apply as Installer
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-solar-500">$350B</div>
              <div className="text-muted-foreground">Financing Gap</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-stellar-500">8-15%</div>
              <div className="text-muted-foreground">Expected Yields</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-500">100%</div>
              <div className="text-muted-foreground">Renewable</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A simple, transparent process connecting capital with real solar projects
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="glass-card card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-solar-500/10 flex items-center justify-center mb-4">
                  <Sun className="h-6 w-6 text-solar-500" />
                </div>
                <CardTitle>1. Projects Listed</CardTitle>
                <CardDescription>
                  Vetted solar installers submit projects for financing. Each project is thoroughly reviewed and approved.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="glass-card card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-stellar-500/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-stellar-500" />
                </div>
                <CardTitle>2. Invest & Earn</CardTitle>
                <CardDescription>
                  Investors purchase tokenized shares with USDC. Tokens represent ownership in real solar assets with predictable yields.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="glass-card card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle>3. Yield Distribution</CardTitle>
                <CardDescription>
                  Energy revenue is distributed automatically to token holders via Stellar smart contracts. Track everything on-chain.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-foreground">Why Solar?</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-solar-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-solar-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Asset-Backed Security</h3>
                    <p className="text-muted-foreground">Every token is backed by real solar infrastructure generating real revenue.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-stellar-500/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 text-stellar-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Global Accessibility</h3>
                    <p className="text-muted-foreground">Invest in solar projects worldwide with just a wallet. No minimums, no borders.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Installer-Friendly</h3>
                    <p className="text-muted-foreground">Fast financing for solar developers. Get funded, not replaced.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-solar-500/20 to-stellar-500/20 rounded-3xl blur-3xl" />
              <Card className="glass-card relative">
                <CardHeader>
                  <CardTitle className="text-foreground">Start Your Solar Journey</CardTitle>
                  <CardDescription>Join the renewable energy revolution today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/register?role=investor" className="block">
                    <Button variant="solar" className="w-full">
                      I want to invest
                    </Button>
                  </Link>
                  <Link href="/register?role=installer" className="block">
                    <Button variant="outline" className="w-full">
                      I'm a solar installer
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-solar-500" />
              <span className="font-bold">Solar</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2026 Solar. Financing the solar revolution on Stellar.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
