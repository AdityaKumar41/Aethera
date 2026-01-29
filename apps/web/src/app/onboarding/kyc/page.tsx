"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  ExternalLink 
} from "lucide-react";

interface KycStatus {
  status: "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED";
  submittedAt?: string;
  verifiedAt?: string;
  sumsub?: {
    applicantId: string;
    status: string;
    reviewAnswer?: string;
    rejectLabels?: string[];
    moderationComment?: string;
  };
}

export default function KycPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [startingKyc, setStartingKyc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKycStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/kyc/status", {
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.success) {
        setKycStatus(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch KYC status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKycStatus();
  }, [fetchKycStatus]);

  const startKyc = async () => {
    setStartingKyc(true);
    setError(null);

    try {
      const response = await fetch("/api/kyc/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ level: "basic" }),
      });

      const data = await response.json();

      if (data.success) {
        // Initialize Sumsub WebSDK
        loadSumsubWebSdk(data.data.accessToken);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to start KYC verification");
    } finally {
      setStartingKyc(false);
    }
  };

  const loadSumsubWebSdk = (accessToken: string) => {
    // Load Sumsub WebSDK script
    const script = document.createElement("script");
    script.src = "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";
    script.async = true;
    script.onload = () => {
      launchSumsubSdk(accessToken);
    };
    document.body.appendChild(script);
  };

  const launchSumsubSdk = (accessToken: string) => {
    // @ts-ignore - Sumsub WebSDK types not available
    const snsWebSdkInstance = window.snsWebSdk
      .init(accessToken, () => {
        // Token expiration handler - fetch new token
        return fetch("/api/kyc/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ level: "basic" }),
        })
          .then((res) => res.json())
          .then((data) => data.data.accessToken);
      })
      .withConf({
        lang: "en",
        theme: "light",
      })
      .withOptions({
        addViewportTag: false,
        adaptIframeHeight: true,
      })
      .on("idCheck.onStepCompleted", (payload: any) => {
        console.log("Step completed:", payload);
      })
      .on("idCheck.onError", (error: any) => {
        console.error("SDK error:", error);
        setError("Verification error occurred. Please try again.");
      })
      .on("idCheck.onApplicantSubmitted", () => {
        console.log("Applicant submitted");
        setKycStatus((prev) => prev ? { ...prev, status: "IN_REVIEW" } : null);
      })
      .on("idCheck.onApplicantResubmitted", () => {
        console.log("Applicant resubmitted");
      })
      .build();

    snsWebSdkInstance.launch("#sumsub-websdk-container");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "IN_REVIEW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "IN_REVIEW":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Identity Verification</h1>
        <p className="text-muted-foreground mt-2">
          Complete your KYC verification to start investing in solar projects.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(kycStatus?.status || "PENDING")}
              <div>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>Your current KYC verification status</CardDescription>
              </div>
            </div>
            <Badge className={getStatusColor(kycStatus?.status || "PENDING")}>
              {kycStatus?.status || "NOT STARTED"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {kycStatus?.status === "VERIFIED" && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Your identity has been verified!</span>
              </div>
              <p className="text-green-700 mt-2 text-sm">
                You can now invest in solar projects on the marketplace.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => router.push("/dashboard/marketplace")}
              >
                Browse Marketplace
              </Button>
            </div>
          )}

          {kycStatus?.status === "REJECTED" && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Verification was not successful</span>
              </div>
              {kycStatus.sumsub?.rejectLabels && (
                <div className="mt-2">
                  <p className="text-red-700 text-sm">Reasons:</p>
                  <ul className="list-disc list-inside text-red-600 text-sm mt-1">
                    {kycStatus.sumsub.rejectLabels.map((label, i) => (
                      <li key={i}>{label}</li>
                    ))}
                  </ul>
                </div>
              )}
              {kycStatus.sumsub?.moderationComment && (
                <p className="text-red-600 text-sm mt-2">
                  {kycStatus.sumsub.moderationComment}
                </p>
              )}
              <Button 
                className="mt-4" 
                variant="outline"
                onClick={startKyc}
                disabled={startingKyc}
              >
                {startingKyc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Try Again
              </Button>
            </div>
          )}

          {kycStatus?.status === "IN_REVIEW" && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Verification in progress</span>
              </div>
              <p className="text-yellow-700 mt-2 text-sm">
                Your documents are being reviewed. This usually takes 5-10 minutes.
              </p>
              <Button 
                className="mt-4" 
                variant="outline"
                onClick={fetchKycStatus}
              >
                Refresh Status
              </Button>
            </div>
          )}

          {kycStatus?.status === "PENDING" && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">What you'll need:</h3>
                <ul className="mt-2 space-y-2 text-blue-800 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Government-issued ID (Passport, Driver's License, or National ID)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Selfie for face verification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Good lighting and camera access
                  </li>
                </ul>
              </div>

              <Button 
                size="lg" 
                className="w-full" 
                onClick={startKyc}
                disabled={startingKyc}
              >
                {startingKyc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Verification
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Powered by Sumsub. Your data is encrypted and securely processed.
                <a 
                  href="https://sumsub.com/privacy-notice" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
                >
                  Privacy Policy <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sumsub WebSDK Container */}
      <div 
        id="sumsub-websdk-container" 
        className="min-h-[600px] rounded-lg border bg-white"
      />
    </div>
  );
}
