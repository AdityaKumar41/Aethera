/**
 * Custom hooks for fetching dashboard data
 */

import { useState, useEffect, useCallback } from 'react';
import { userApi, projectApi, investmentApi, yieldApi, kycApi } from '@/lib/api';
import type { 
  UserProfile, 
  PortfolioData, 
  WalletBalances,
  Project, 
  Investment, 
  YieldSummary,
  YieldClaim,
  KycStatus,
  KycStartResponse
} from '@/lib/api';

// ==========================
// useUserProfile Hook
// ==========================

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const response = await userApi.getProfile();
    if (response.success && response.data) {
      setProfile(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch profile');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

// ==========================
// usePortfolio Hook
// ==========================

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    const response = await userApi.getPortfolio();
    if (response.success && response.data) {
      setPortfolio(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch portfolio');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return { portfolio, loading, error, refetch: fetchPortfolio };
}

// ==========================
// useWalletBalances Hook
// ==========================

export function useWalletBalances() {
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    const response = await userApi.getWalletBalances();
    if (response.success && response.data) {
      setBalances(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch balances');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, error, refetch: fetchBalances };
}

// ==========================
// useMarketplace Hook
// ==========================

export function useMarketplace(page = 1, limit = 20, status?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const response = await projectApi.getMarketplace(page, limit, status);
    if (response.success && response.data) {
      setProjects(response.data.data);
      setPagination(response.data.pagination);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch projects');
    }
    setLoading(false);
  }, [page, limit, status]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, lastRefreshed]);

  return { projects, pagination, loading, error, refetch: () => setLastRefreshed(Date.now()) };
}

// ==========================
// useInvestments Hook
// ==========================

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    const response = await investmentApi.getMyInvestments();
    if (response.success && response.data) {
      setInvestments(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch investments');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  return { investments, loading, error, refetch: fetchInvestments };
}

// ==========================
// useYields Hook
// ==========================

export function useYields() {
  const [summary, setSummary] = useState<YieldSummary | null>(null);
  const [pendingClaims, setPendingClaims] = useState<YieldClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const fetchYields = useCallback(async () => {
    setLoading(true);
    const [summaryRes, pendingRes] = await Promise.all([
      yieldApi.getSummary(),
      yieldApi.getPending(),
    ]);

    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data);
    }
    if (pendingRes.success && pendingRes.data) {
      setPendingClaims(pendingRes.data.claims);
    }
    if (!summaryRes.success) {
      setError(summaryRes.error || 'Failed to fetch yields');
    }
    setLoading(false);
  }, []);

  const claimAll = useCallback(async () => {
    if (pendingClaims.length === 0) return { success: false, error: 'No claims available' };
    
    setClaiming(true);
    const claimIds = pendingClaims.map(c => c.id);
    const response = await yieldApi.claimBatch(claimIds);
    setClaiming(false);

    if (response.success) {
      await fetchYields(); // Refresh data
    }
    return response;
  }, [pendingClaims, fetchYields]);

  useEffect(() => {
    fetchYields();
  }, [fetchYields]);

  return { summary, pendingClaims, loading, error, claiming, claimAll, refetch: fetchYields };
}

// ==========================
// useKyc Hook
// ==========================

export function useKyc() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [accessToken, setAccessToken] = useState<KycStartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const response = await kycApi.getStatus();
    if (response.success && response.data) {
      setStatus(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch KYC status');
    }
    setLoading(false);
  }, []);

  const startKyc = useCallback(async (level: 'basic' | 'enhanced' | 'accredited' = 'basic') => {
    setStarting(true);
    const response = await kycApi.start(level);
    setStarting(false);

    if (response.success && response.data) {
      setAccessToken(response.data);
      return response.data;
    } else {
      setError(response.error || 'Failed to start KYC');
      return null;
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { 
    status, 
    accessToken, 
    loading, 
    starting, 
    error, 
    startKyc, 
    refetch: fetchStatus 
  };
}
// ==========================
// useInstallerProjects Hook
// ==========================

export function useInstallerProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const response = await projectApi.getMyProjects();
    if (response.success && response.data) {
      setProjects(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch installer projects');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}
