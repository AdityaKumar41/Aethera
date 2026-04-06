import { apiRequest } from "./api";

export interface TokenListing {
  id: string;
  projectId: string;
  fromUserId: string;
  tokenAmount: number;
  pricePerToken: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  fromUser: {
    id: string;
    email: string;
    fullName: string | null;
  };
  project: {
    id: string;
    name: string;
    pricePerToken: number;
  };
}

export interface CreateListingData {
  projectId: string;
  tokenAmount: number;
  pricePerToken: number;
}

export const tokenTransferApi = {
  // Create a new token listing (sell tokens)
  createListing: async (data: CreateListingData): Promise<TokenListing> => {
    const response = await apiRequest<TokenListing>(
      "/api/token-transfers/listings",
      {
        method: "POST",
        body: data,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to create listing");
    }
    return response.data;
  },

  // Get all available listings for a project
  getProjectListings: async (projectId: string): Promise<TokenListing[]> => {
    const response = await apiRequest<TokenListing[]>(
      `/api/token-transfers/projects/${projectId}/listings`,
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load listings");
    }
    return response.data;
  },

  // Get user's own listings
  getUserListings: async (): Promise<TokenListing[]> => {
    const response = await apiRequest<TokenListing[]>(
      "/api/token-transfers/my-listings",
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load listings");
    }
    return response.data;
  },

  // Accept/buy a listing
  acceptListing: async (listingId: string): Promise<TokenListing> => {
    const response = await apiRequest<TokenListing>(
      `/api/token-transfers/listings/${listingId}/accept`,
      {
        method: "POST",
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to purchase tokens");
    }
    return response.data;
  },

  // Cancel a listing
  cancelListing: async (listingId: string): Promise<void> => {
    const response = await apiRequest(
      `/api/token-transfers/listings/${listingId}`,
      {
        method: "DELETE",
      },
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to cancel listing");
    }
  },
};
