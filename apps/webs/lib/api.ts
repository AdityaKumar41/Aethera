/**
 * API Client for Aethera Dashboard
 *
 * Handles all API requests with Clerk authentication.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: { field: string; message: string }[];
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {} } = options;

  try {
    // Get Clerk token from session
    const token = await getClerkToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
        details: data.details,
      };
    }

    return data;
  } catch (error) {
    console.error("API request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

/**
 * Get Clerk session token
 */
async function getClerkToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    // @ts-expect-error - Clerk types
    const clerk = window.Clerk;
    if (!clerk?.session) return null;
    return await clerk.session.getToken();
  } catch {
    return null;
  }
}

// ==========================
// API Endpoints
// ==========================

// User endpoints
export const userApi = {
  getProfile: () => apiRequest<UserProfile>("/api/users/profile"),
  updateProfile: (data: Partial<UserProfile>) =>
    apiRequest<UserProfile>("/api/users/profile", {
      method: "PATCH",
      body: data,
    }),
  getPortfolio: () => apiRequest<PortfolioData>("/api/users/portfolio"),
  getWalletBalances: () =>
    apiRequest<WalletBalances>("/api/users/wallet/balances"),
  claimWalletBalances: (balanceIds: string[]) =>
    apiRequest<{ txHash?: string }>("/api/users/wallet/claim", {
      method: "POST",
      body: { balanceIds },
    }),
  getWalletTransactions: () =>
    apiRequest<Transaction[]>("/api/users/wallet/transactions"),
  sync: (data: any) =>
    apiRequest<UserProfile>("/api/auth/sync", {
      method: "POST",
      body: data,
    }),
  getMe: () => apiRequest<UserProfile>("/api/auth/me"),
};

export interface Transaction {
  id: string;
  hash: string;
  created_at: string;
  source_account: string;
  fee_charged: string;
  memo: string;
  successful: boolean;
  operation_type?: string;
  summary?: string;
  amount?: string;
  asset?: string;
  direction?: "in" | "out" | "neutral";
  counterparty?: string;
}

// KYC endpoints
export const kycApi = {
  start: (level: "basic" | "enhanced" | "accredited" = "basic") =>
    apiRequest<KycStartResponse>("/api/kyc/start", {
      method: "POST",
      body: { level },
    }),
  getStatus: () => apiRequest<KycStatus>("/api/kyc/status"),
  getRequirements: () => apiRequest<KycRequirements>("/api/kyc/requirements"),
};

// Project endpoints
export const projectApi = {
  getMarketplace: (page = 1, limit = 20, status?: string) =>
    apiRequest<{ data: Project[]; pagination: Pagination }>(
      `/api/projects/marketplace?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`,
    ),
  getProject: (id: string) => apiRequest<Project>(`/api/projects/${id}`),
  getMyProjects: () => apiRequest<Project[]>("/api/projects/my/projects"),
  createProject: (data: Partial<Project>) =>
    apiRequest<Project>("/api/projects", { method: "POST", body: data }),

  reportProduction: (
    projectId: string,
    data: { energyProduced: number; recordedAt: string; notes?: string },
  ) =>
    apiRequest<any>(`/api/projects/${projectId}/production`, {
      method: "POST",
      body: data,
    }),
  getMyProductionHistory: () =>
    apiRequest<{ records: any[]; totalKwh: number; avgDailyKwh: number }>(
      "/api/projects/my/production",
    ),
};

export const oracleApi = {
  registerDevice: (data: {
    projectId: string;
    publicKey: string;
    metadata?: any;
  }) =>
    apiRequest<any>("/api/oracle/devices/register", {
      method: "POST",
      body: data,
    }),
  getProjectDevices: (projectId: string) =>
    apiRequest<any[]>(`/api/oracle/projects/${projectId}/devices`),
  getDeviceTelemetry: (deviceId: string) =>
    apiRequest<any[]>(`/api/oracle/devices/${deviceId}/telemetry`),
  deleteDevice: (deviceId: string) =>
    apiRequest<any>(`/api/oracle/devices/${deviceId}`, { method: "DELETE" }),
};

export const adminApi = {
  getPendingKYC: () => apiRequest<any[]>("/api/admin/kyc/pending"),
  approveKYC: (userId: string) =>
    apiRequest<any>(`/api/admin/kyc/${userId}/approve`, { method: "POST" }),
  rejectKYC: (userId: string, reason?: string) =>
    apiRequest<any>(`/api/admin/kyc/${userId}/reject`, {
      method: "POST",
      body: { reason: reason || "Does not meet verification requirements" },
    }),
  getStats: () => apiRequest<any>("/api/admin/dashboard"),
  getAllProjects: () => apiRequest<Project[]>("/api/admin/projects/all"),
  getProject: (id: string) => apiRequest<Project>(`/api/admin/projects/${id}`),
  getPendingProjects: () =>
    apiRequest<Project[]>("/api/admin/projects/pending"),
  getFundedProjects: () => apiRequest<Project[]>("/api/admin/projects/funded"),
  approveProject: (id: string) =>
    apiRequest<any>(`/api/admin/projects/${id}/approve`, { method: "POST" }),
  rejectProject: (id: string, reason: string) =>
    apiRequest<any>(`/api/admin/projects/${id}/reject`, {
      method: "POST",
      body: { reason },
    }),
  activateProject: (id: string) =>
    apiRequest<any>(`/api/admin/projects/${id}/activate`, { method: "POST" }),
  deployToken: (projectId: string) =>
    apiRequest<any>(`/api/stellar/admin/deploy-token/${projectId}`, {
      method: "POST",
    }),
  verifyMilestone: (id: string) =>
    apiRequest<any>(`/api/milestones/${id}/verify`, { method: "POST" }),
  rejectMilestone: (id: string, reason: string) =>
    apiRequest<any>(`/api/milestones/${id}/reject`, {
      method: "POST",
      body: { reason },
    }),
  getSubmittedMilestones: () => apiRequest<any[]>("/api/milestones/submitted"),
  getActiveProjects: () =>
    apiRequest<Project[]>("/api/admin/projects/active"),
  distributeYield: (data: {
    projectId: string;
    periodStart: string;
    periodEnd: string;
    revenuePerKwh?: number;
    platformFeePercent?: number;
    notes?: string;
  }) =>
    apiRequest<any>("/api/yields/distribute", { method: "POST", body: data }),
};

export interface AdminDashboardStats {
  users: {
    total: number;
    investors: number;
    installers: number;
  };
  projects: {
    total: number;
    pending: number;
    approved: number;
    active: number;
    activePendingData: number;
    funding: number;
    funded: number;
    completed: number;
  };
  kyc: {
    pendingReview: number;
  };
  funding: {
    totalRaised: number;
    totalTarget: number;
  };
  queues: {
    underReview: number;
    approvedAwaitingDeployment: number;
    fundingLive: number;
    readyToActivate: number;
    activeOperations: number;
  };
  recentProjects: Project[];
  recentKycSubmissions: Array<{
    id: string;
    email: string;
    name?: string | null;
    role: "INVESTOR" | "INSTALLER" | "ADMIN";
    kycSubmittedAt?: string | null;
  }>;
}

export const milestoneApi = {
  getProjectMilestones: (projectId: string) =>
    apiRequest<ProjectMilestone[]>(`/api/milestones/project/${projectId}`),
  submitProof: (id: string, proofDocuments: any) =>
    apiRequest<ProjectMilestone>(`/api/milestones/${id}/submit`, {
      method: "POST",
      body: { proofDocuments },
    }),
};

// Wallet endpoints
export const walletApi = {
  getBalances: () => apiRequest<WalletBalances>("/api/stellar/wallet"),
  getTransactions: () => apiRequest<any[]>("/api/stellar/transactions"),
  fundTestnet: () =>
    apiRequest<{ message: string }>("/api/stellar/wallet/fund-testnet", {
      method: "POST",
    }),
  checkTrustline: () => apiRequest<any>("/api/stellar/trustline/check"),
  createTrustline: () =>
    apiRequest<any>("/api/stellar/trustline/create", { method: "POST" }),
  fundTestUsdc: (amount?: string) =>
    apiRequest<any>("/api/stellar/fund-test-usdc", {
      method: "POST",
      body: { amount: amount || "100" },
    }),
};

// Investment endpoints
export const investmentApi = {
  getMyInvestments: () => apiRequest<Investment[]>("/api/investments/my"),
  getInvestment: (id: string) =>
    apiRequest<Investment>(`/api/investments/${id}`),
  getInvestmentStatus: (id: string) =>
    apiRequest<InvestmentStatus>(`/api/investments/${id}/status`),
  createInvestment: (data: { projectId: string; amount: number }) =>
    apiRequest<Investment>("/api/investments", { method: "POST", body: data }),
};

// Yield endpoints
export const yieldApi = {
  getSummary: () => apiRequest<YieldSummary>("/api/yields/summary"),
  getPending: () =>
    apiRequest<{ claims: YieldClaim[]; totalPending: number }>(
      "/api/yields/pending",
    ),
  getHistory: () => apiRequest<{ claims: YieldClaim[] }>("/api/yields/history"),
  claimBatch: (claimIds: string[]) =>
    apiRequest<{ success: number; failed: number }>("/api/yields/claim/batch", {
      method: "POST",
      body: { claimIds },
    }),
};

// ==========================
// Types
// ==========================

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: "INVESTOR" | "INSTALLER" | "ADMIN";
  kycStatus: "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED";
  stellarPubKey?: string;
  phone?: string;
  company?: string;
  address?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioData {
  totalInvested: number;
  totalTokens: number;
  pendingYieldAmount: number;
  investments: Investment[];
  impact?: {
    carbonOffset: number;
    treesPlanted: number;
    waterSaved: number;
    cleanEnergy: number;
  };
}

export interface WalletBalances {
  publicKey?: string;
  balances: Array<{
    asset: string;
    balance: string;
  }>;
  claimableBalances: Array<{
    id: string;
    asset: string;
    amount: string;
    sponsor: string;
  }>;
  funded: boolean;
}

export interface KycStartResponse {
  accessToken: string;
  applicantId: string;
  level: string;
}

export interface KycStatus {
  status: "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED";
  submittedAt?: string;
  verifiedAt?: string;
  sumsub?: {
    applicantId: string;
    status: string;
    level?: string;
    reviewAnswer?: string;
    rejectLabels?: string[];
    moderationComment?: string;
  };
}

export interface KycRequirements {
  level: string;
  documents: string[];
  additionalForLargeInvestments?: string[];
  additionalDocuments?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  country: string;
  capacity: number;
  expectedYield: number;
  fundingTarget: number;
  fundingRaised: number;
  pricePerToken: number;
  totalTokens: number;
  tokensRemaining: number;
  tokenSymbol?: string | null;
  tokenContractId?: string | null;
  status:
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "FUNDING"
    | "FUNDED"
    | "ACTIVE_PENDING_DATA"
    | "ACTIVE"
    | "COMPLETED";
  installer?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    country?: string;
    stellarPubKey?: string | null;
  };
  investorCount?: number;
  fundingPercentage?: number;
  totalEnergyProduced?: number;
  fundingModel?: "FULL_UPFRONT" | "MILESTONE_BASED";
  totalEscrowedAmount?: number;
  totalReleasedAmount?: number;
  milestones?: ProjectMilestone[];
  iotDevices?: Array<{
    id: string;
    publicKey: string;
    status: string;
    createdAt: string;
  }>;
  _count?: {
    investments?: number;
    iotDevices?: number;
    milestones?: number;
    productionData?: number;
  };
  rejectionReason?: string | null;
  createdAt?: string;
  approvedAt?: string | null;
  updatedAt?: string;
  estimatedCompletionDate?: string | null;
  lastProductionUpdate?: string | null;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;
  releasePercentage: number;
  releaseAmount: number;
  status: "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "RELEASED";
  verificationMethod: "DOCUMENT" | "PHOTO" | "IOT" | "ORACLE";
  proofDocuments?: any;
  submittedAt?: string;
  verifiedAt?: string;
  releasedAt?: string;
  verificationTxHash?: string;
  createdAt: string;
}

export interface Investment {
  id: string;
  amount: number;
  tokenAmount: number;
  status: "PENDING" | "PENDING_ONCHAIN" | "CONFIRMED" | "FAILED" | "CANCELLED";
  txHash?: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    tokenSymbol: string;
    status: string;
    expectedYield: number;
    location?: string;
    pricePerToken?: number;
  };
}

export interface InvestmentStatus {
  id: string;
  status: "PENDING" | "PENDING_ONCHAIN" | "CONFIRMED" | "FAILED" | "CANCELLED";
  txHash?: string;
  txLedger?: number;
  txConfirmedAt?: string;
  mintStatus?: "PENDING" | "SUBMITTED" | "CONFIRMED" | "FAILED";
  mintConfirmedAt?: string;
  amount: number;
  tokenAmount: number;
}

export interface YieldSummary {
  totalClaimed: number;
  totalPending: number;
  claimedCount: number;
  pendingCount: number;
  totalYield: number;
  recentClaims: YieldClaim[];
  pendingClaims: YieldClaim[];
}

export interface YieldClaim {
  id: string;
  amount: number;
  claimed: boolean;
  claimedAt?: string;
  createdAt: string;
  project?: {
    name: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
