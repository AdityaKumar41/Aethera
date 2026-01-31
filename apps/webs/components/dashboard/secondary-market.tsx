"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tokenTransferApi, type TokenListing } from "@/lib/token-transfer-api";
import { Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface SecondaryMarketProps {
  projectId: string;
  projectName: string;
  currentPrice: number;
}

export function SecondaryMarket({
  projectId,
  projectName,
  currentPrice,
}: SecondaryMarketProps) {
  const { user } = useUser();
  const [listings, setListings] = useState<TokenListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await tokenTransferApi.getProjectListings(projectId);
      setListings(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load listings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [projectId]);

  const handleBuy = async (listingId: string) => {
    try {
      setProcessingId(listingId);
      setError("");
      await tokenTransferApi.acceptListing(listingId);
      await loadListings(); // Refresh listings
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to purchase tokens");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (listingId: string) => {
    try {
      setProcessingId(listingId);
      setError("");
      await tokenTransferApi.cancelListing(listingId);
      await loadListings(); // Refresh listings
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cancel listing");
    } finally {
      setProcessingId(null);
    }
  };

  const getPriceIndicator = (listingPrice: number) => {
    const diff = ((listingPrice - currentPrice) / currentPrice) * 100;

    if (Math.abs(diff) < 1) {
      return <Badge variant="secondary">Market Price</Badge>;
    } else if (diff > 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />+{diff.toFixed(1)}%
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="default"
          className="flex items-center gap-1 bg-green-600"
        >
          <TrendingDown className="h-3 w-3" />
          {diff.toFixed(1)}%
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Secondary Market</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secondary Market</CardTitle>
        <p className="text-sm text-muted-foreground">
          Available token listings for {projectName}
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {listings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tokens available for sale</p>
            <p className="text-sm mt-2">Check back later for new listings</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => {
              const totalValue = listing.tokenAmount * listing.pricePerToken;
              const isOwnListing = listing.fromUserId === user?.id;

              return (
                <div
                  key={listing.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {listing.tokenAmount} tokens
                        </span>
                        {getPriceIndicator(listing.pricePerToken)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Seller:{" "}
                        {isOwnListing
                          ? "You"
                          : listing.fromUser.fullName || listing.fromUser.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Price per token
                      </div>
                      <div className="font-semibold">
                        {listing.pricePerToken.toFixed(2)} XLM
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Total Value
                      </div>
                      <div className="font-bold">
                        {totalValue.toFixed(2)} XLM
                      </div>
                    </div>

                    {isOwnListing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(listing.id)}
                        disabled={processingId === listing.id}
                      >
                        {processingId === listing.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          "Cancel Listing"
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleBuy(listing.id)}
                        disabled={processingId === listing.id}
                      >
                        {processingId === listing.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Buying...
                          </>
                        ) : (
                          "Buy Tokens"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
