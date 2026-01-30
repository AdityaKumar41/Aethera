/**
 * Investment Hook for handling investment transactions
 */

import { useState, useCallback } from 'react';
import { investmentApi, projectApi } from '@/lib/api';
import type { Project, Investment } from '@/lib/api';

interface InvestmentParams {
  projectId: string;
  amount: number;
}

interface UseInvestmentReturn {
  invest: (params: InvestmentParams) => Promise<{ success: boolean; data?: any; error?: string }>;
  pollStatus: (investmentId: string) => Promise<void>;
  loading: boolean;
  confirming: boolean;
  error: string | null;
  investment: Investment | null;
  status: 'idle' | 'submitting' | 'confirming' | 'confirmed' | 'failed';
}

export function useInvestment(): UseInvestmentReturn {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'confirming' | 'confirmed' | 'failed'>('idle');

  const invest = useCallback(async (params: InvestmentParams) => {
    setLoading(true);
    setError(null);
    setStatus('submitting');

    try {
      const response = await investmentApi.createInvestment(params);
      
      if (!response.success) {
        setError(response.error || 'Failed to create investment');
        setStatus('failed');
        return { success: false, error: response.error };
      }
      
      setInvestment(response.data as Investment);
      setStatus('confirming');
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Investment failed';
      setError(errorMessage);
      setStatus('failed');
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const pollStatus = useCallback(async (investmentId: string) => {
    setConfirming(true);
    
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/investments/${investmentId}/status`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const invStatus = data.data.status;
          
          if (invStatus === 'CONFIRMED') {
            setStatus('confirmed');
            setConfirming(false);
            return;
          }
          
          if (invStatus === 'FAILED' || invStatus === 'CANCELLED') {
            setStatus('failed');
            setError('Transaction failed or was cancelled');
            setConfirming(false);
            return;
          }
        }
        
        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (err) {
        // Continue polling on network errors
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    // Timeout - check final status
    setConfirming(false);
    setStatus('confirming'); // Still confirming, might take longer
  }, []);

  return {
    invest,
    pollStatus,
    loading,
    confirming,
    error,
    investment,
    status,
  };
}

/**
 * Hook to get project details for investment
 */
export function useProjectDetails(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await projectApi.getProject(projectId);
      
      if (response.success && response.data) {
        setProject(response.data);
      } else {
        setError(response.error || 'Failed to fetch project');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { project, loading, error, fetchProject };
}
