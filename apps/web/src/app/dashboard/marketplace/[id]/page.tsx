"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Sun,
  Zap,
  TrendingUp,
  Building,
  Calendar,
  DollarSign,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investing, setInvesting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchProject() {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await api.getProject(params.id as string, token);
        setProject(response.data);
      } catch (error) {
        console.error("Failed to fetch project:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load project details",
        });
      } finally {
        setLoading(false);
      }
    }

    if (mounted && params.id) {
      fetchProject();
    }
  }, [params.id, getToken, toast, mounted]);

  const handleInvest = async () => {
    const amount = parseFloat(investmentAmount);

    if (!amount || amount < 10) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Minimum investment is $10",
      });
      return;
    }

    if (
      amount >
      parseFloat(project.fundingTarget) - parseFloat(project.fundingRaised)
    ) {
      toast({
        variant: "destructive",
        title: "Amount Too Large",
        description: "Investment exceeds remaining funding needed",
      });
      return;
    }

    setInvesting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await api.createInvestment(
        {
          projectId: project.id,
          amount,
        },
        token,
      );

      toast({
        title: "Investment Successful! 🎉",
        description: `You invested ${formatCurrency(amount)} in ${project.name}`,
      });

      // Redirect to portfolio
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (error: any) {
      console.error("Investment failed:", error);
      toast({
        variant: "destructive",
        title: "Investment Failed",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setInvesting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
        <Link href="/dashboard/marketplace">
          <Button variant="outline">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  const fundingPercentage =
    (parseFloat(project.fundingRaised) / parseFloat(project.fundingTarget)) *
    100;
  const remainingFunding =
    parseFloat(project.fundingTarget) - parseFloat(project.fundingRaised);
  const tokensToReceive = investmentAmount
    ? Math.floor(
      parseFloat(investmentAmount) / parseFloat(project.pricePerToken),
    )
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Back Button */}
      <Link href="/dashboard/marketplace">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Button>
      </Link>

      {/* Project Header */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              {project.location}, {project.country}
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {project.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              {project.description}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {project.capacity} kW
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Expected Yield
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {project.expectedYield}% APY
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Annual Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {project.estimatedAnnualProduction?.toLocaleString() || "N/A"}{" "}
                  kWh
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Token Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(project.pricePerToken)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Technical Details */}
          <Card className="bg-card/30 backdrop-blur-xl border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Technical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Panel Type</p>
                <p className="text-foreground font-medium">
                  {project.panelType || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inverter Type</p>
                <p className="text-foreground font-medium">
                  {project.inverterType || "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Estimated Completion
                </p>
                <p className="text-foreground font-medium">
                  {project.estimatedCompletionDate
                    ? new Date(
                      project.estimatedCompletionDate,
                    ).toLocaleDateString()
                    : "To be determined"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Token Symbol</p>
                <p className="text-foreground font-medium">{project.tokenSymbol}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Investment Card */}
        <div className="lg:w-96 lg:sticky lg:top-8 self-start">
          <Card className="bg-white/70 backdrop-blur-xl border-zinc-200 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Investment Details</CardTitle>
              <CardDescription>
                Earn {project.expectedYield}% annual yield
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Funding Progress */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Funding Progress
                  </span>
                  <span className="text-foreground font-semibold">
                    {Math.round(fundingPercentage)}%
                  </span>
                </div>
                <Progress value={fundingPercentage} className="h-3" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Raised: {formatCurrency(project.fundingRaised)}
                  </span>
                  <span className="text-muted-foreground">
                    Goal: {formatCurrency(project.fundingTarget)}
                  </span>
                </div>
              </div>

              {/* Investment Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Investment Amount (USDC)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  min="10"
                  max={remainingFunding}
                  step="10"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: $10 • Remaining: {formatCurrency(remainingFunding)}
                </p>
              </div>

              {/* Token Calculation */}
              {tokensToReceive > 0 && (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">
                    You will receive
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {tokensToReceive} {project.tokenSymbol}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    @ {formatCurrency(project.pricePerToken)} per token
                  </p>
                </div>
              )}

              {/* Invest Button */}
              <Button
                className="w-full text-lg py-6"
                variant="solar"
                onClick={handleInvest}
                disabled={
                  !investmentAmount ||
                  investing ||
                  parseFloat(investmentAmount) < 10
                }
              >
                {investing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Invest Now"
                )}
              </Button>

              {/* Info */}
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  ✓ Backed by real solar infrastructure
                </p>
                <p className="flex items-center gap-2">
                  ✓ Earn yield from energy production
                </p>
                <p className="flex items-center gap-2">
                  ✓ Transparent on-chain ownership
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
