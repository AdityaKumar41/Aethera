"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, X } from "lucide-react";
import { tokenTransferApi } from "@/lib/token-transfer-api";

interface SellTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  availableTokens: number;
  currentPrice: number;
  onSuccess?: () => void;
}

export function SellTokensModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  availableTokens,
  currentPrice,
  onSuccess,
}: SellTokensModalProps) {
  const [tokenAmount, setTokenAmount] = useState("");
  const [pricePerToken, setPricePerToken] = useState(currentPrice.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amount = parseFloat(tokenAmount);
    const price = parseFloat(pricePerToken);

    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid token amount");
      return;
    }

    if (amount > availableTokens) {
      setError(`You only have ${availableTokens} tokens available`);
      return;
    }

    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid price");
      return;
    }

    setStep("confirm");
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError("");

      await tokenTransferApi.createListing({
        projectId,
        tokenAmount: parseFloat(tokenAmount),
        pricePerToken: parseFloat(pricePerToken),
      });

      setStep("success");

      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create listing");
      setStep("input");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTokenAmount("");
    setPricePerToken(currentPrice.toString());
    setError("");
    setStep("input");
    onClose();
  };

  const totalValue =
    parseFloat(tokenAmount || "0") * parseFloat(pricePerToken || "0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-xl font-semibold mb-2">Sell Tokens</h2>
        <p className="text-sm text-muted-foreground mb-6">
          List your tokens for sale on the secondary market
        </p>

        {step === "input" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <div className="text-sm font-medium">{projectName}</div>
              <div className="text-sm text-muted-foreground">
                Available: {availableTokens} tokens
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenAmount">Tokens to Sell</Label>
              <Input
                id="tokenAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                max={availableTokens}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerToken">Price per Token (XLM)</Label>
              <Input
                id="pricePerToken"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={pricePerToken}
                onChange={(e) => setPricePerToken(e.target.value)}
                required
              />
              <div className="text-xs text-muted-foreground">
                Current market price: {currentPrice.toFixed(2)} XLM
              </div>
            </div>

            {tokenAmount && pricePerToken && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-medium">
                    {totalValue.toFixed(2)} XLM
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium">Confirm Listing</h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium">{projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-medium">{tokenAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per Token</span>
                  <span className="font-medium">
                    {parseFloat(pricePerToken).toFixed(2)} XLM
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total Value</span>
                  <span className="font-bold">{totalValue.toFixed(2)} XLM</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("input")}
                disabled={isSubmitting}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Listing...
                  </>
                ) : (
                  "Create Listing"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Listing Created!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your tokens are now available on the secondary market
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
