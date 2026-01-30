/**
 * API Client for Aethera Dashboard
 * 
 * Handles all API requests with Clerk authentication.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options;

  try {
    // Get Clerk token from session
    const token = await getClerkToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

/**
 * Get Clerk session token
 */
async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

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
  getProfile: () => apiRequest<UserProfile>('/api/users/profile'),
  updateProfile: (data: Partial<UserProfile>) =>
    apiRequest<UserProfile>('/api/users/profile', { method: 'PATCH', body: data }),
  getPortfolio: () => apiRequest<PortfolioData>('/api/users/portfolio'),
  getWalletBalances: () => apiRequest<WalletBalances>('/api/users/wallet/balances'),
  getWalletTransactions: () => apiRequest<Transaction[]>('/api/users/wallet/transactions'),
};

export interface Transaction {
  id: string;
  hash: string;
  created_at: string;
  source_account: string;
  fee_charged: string;
  memo: string;
  successful: boolean;
}

// KYC endpoints
export const kycApi = {
  start: (level: 'basic' | 'enhanced' | 'accredited' = 'basic') =>
    apiRequest<KycStartResponse>('/api/kyc/start', { method: 'POST', body: { level } }),
  getStatus: () => apiRequest<KycStatus>('/api/kyc/status'),
  getRequirements: () => apiRequest<KycRequirements>('/api/kyc/requirements'),
};

// Project endpoints
export const projectApi = {
  getMarketplace: (page = 1, limit = 20, status?: string) =>
    apiRequest<{ data: Project[]; pagination: Pagination }>(
      `/api/projects/marketplace?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`
    ),
  getProject: (id: string) => apiRequest<Project>(`/api/projects/${id}`),
  getMyProjects: () => apiRequest<Project[]>('/api/projects/my/projects'),
  createProject: (data: Partial<Project>) => 
    apiRequest<Project>('/api/projects', { method: 'POST', body: data }),
  
  reportProduction: (projectId: string, data: { energyProduced: number, recordedAt: string, notes?: string }) =>
    apiRequest<any>(`/api/projects/${projectId}/production`, { method: 'POST', body: data }),
};

export const adminApi = {
  getPendingKYC: () => apiRequest<any[]>('/api/admin/kyc/pending'),
  approveKYC: (userId: string) => apiRequest<any>(`/api/admin/kyc/${userId}/approve`, { method: 'POST' }),
  getStats: () => apiRequest<any>('/api/admin/stats'),
  getPendingProjects: () => apiRequest<Project[]>('/api/admin/projects?status=PENDING_APPROVAL'),
  approveProject: (id: string) => apiRequest<any>(`/api/admin/projects/${id}/approve`, { method: 'POST' }),
  rejectProject: (id: string, reason: string) => apiRequest<any>(`/api/admin/projects/${id}/reject`, { method: 'POST', body: { reason } }),
};

// Investment endpoints
export const investmentApi = {
  getMyInvestments: () => apiRequest<Investment[]>('/api/investments/my'),
  getInvestment: (id: string) => apiRequest<Investment>(`/api/investments/${id}`),
  createInvestment: (data: { projectId: string; amount: number }) =>
    apiRequest<Investment>('/api/investments', { method: 'POST', body: data }),
};

// Yield endpoints
export const yieldApi = {
  getSummary: () => apiRequest<YieldSummary>('/api/yields/summary'),
  getPending: () => apiRequest<{ claims: YieldClaim[]; totalPending: number }>('/api/yields/pending'),
  getHistory: () => apiRequest<{ claims: YieldClaim[] }>('/api/yields/history'),
  claimBatch: (claimIds: string[]) =>
    apiRequest<{ success: number; failed: number }>('/api/yields/claim/batch', {
      method: 'POST',
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
  role: 'INVESTOR' | 'INSTALLER' | 'ADMIN';
  kycStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
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
}

export interface WalletBalances {
  publicKey?: string;
  balances: Array<{
    asset: string;
    balance: string;
  }>;
  funded: boolean;
}

export interface KycStartResponse {
  accessToken: string;
  applicantId: string;
  level: string;
}

export interface KycStatus {
  status: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
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
  tokenSymbol: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FUNDING' | 'FUNDED' | 'ACTIVE' | 'COMPLETED';
  installer?: {
    id: string;
    name: string;
    company?: string;
  };
  investorCount?: number;
  fundingPercentage?: number;
}

export interface Investment {
  id: string;
  amount: number;
  tokenAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  project: {
    id: string;
    name: string;
    tokenSymbol: string;
    status: string;
    expectedYield: number;
    location?: string;
  };
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
