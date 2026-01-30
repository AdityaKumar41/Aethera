/**
 * Sumsub WebSDK Widget Component
 * 
 * Integrates the Sumsub identity verification flow.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useKyc } from '@/hooks/use-dashboard-data';
import { Loader2, Shield, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SumsubWidgetProps {
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function SumsubWidget({ onComplete, onError }: SumsubWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { status, accessToken, loading, starting, error, startKyc, refetch } = useKyc();

  // Load Sumsub WebSDK script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if ((window as any).snsWebSdk) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => {
      setWidgetError('Failed to load verification SDK');
      onError?.('Failed to load verification SDK');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src*="sns-websdk-builder"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [onError]);

  // Initialize Sumsub widget when SDK is loaded and we have an access token
  useEffect(() => {
    if (!sdkLoaded || !accessToken || !containerRef.current) return;

    try {
      const snsWebSdkInstance = (window as any).snsWebSdk
        .init(accessToken.accessToken, () => {
          // Token refresh callback
          return startKyc().then(res => res?.accessToken || '');
        })
        .withConf({
          lang: 'en',
          theme: 'light',
        })
        .withOptions({
          addViewportTag: false,
          adaptIframeHeight: true,
        })
        .on('idCheck.onStepCompleted', (payload: any) => {
          console.log('Step completed:', payload);
        })
        .on('idCheck.onApplicantSubmitted', () => {
          console.log('[Sumsub] Applicant submitted');
          setIsSubmitted(true);
          // Add a small delay before refetching to allow Sumsub backend to process
          setTimeout(() => {
            console.log('[Sumsub] Performing post-submission refetch...');
            refetch();
          }, 2000);
        })
        .on('idCheck.onApplicantResubmitted', () => {
          console.log('Applicant resubmitted');
          setIsSubmitted(true);
          setTimeout(() => refetch(), 2000);
        })
        .on('idCheck.onApplicantStatusChanged', (payload: any) => {
          console.log('Status changed:', payload);
          // If the status is green or red, we should refetch to update local DB
          refetch();
          if (payload.reviewAnswer === 'GREEN') {
            onComplete?.();
          }
        })
        .on('idCheck.onError', (error: any) => {
          console.error('Sumsub error:', error);
          setWidgetError(error.message || 'Verification error');
          onError?.(error.message || 'Verification error');
        })
        .build();

      snsWebSdkInstance.launch(containerRef.current);
    } catch (err) {
      console.error('Failed to initialize Sumsub:', err);
      setWidgetError('Failed to initialize verification');
    }
  }, [sdkLoaded, accessToken, refetch, onComplete, onError]);

  // Poll for status updates if in review or just submitted
  useEffect(() => {
    // If we're verified, stop polling
    if (status?.status === 'VERIFIED') return;

    // Start polling if in review or if we just clicked submit
    if (!status || (status.status !== 'IN_REVIEW' && !isSubmitted)) return;

    const interval = setInterval(() => {
      refetch();
    }, 5000); // Check every 5 seconds during transition/review

    return () => clearInterval(interval);
  }, [status, isSubmitted, refetch]);

  // Show status if already verified or in review
  if (!loading && status) {
    if (status.status === 'VERIFIED') {
      return (
        <div className="rounded-2xl p-6 bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">KYC Verified</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your identity has been verified. You have full access to all platform features.
              </p>
              {status.verifiedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Verified on {new Date(status.verifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (status.status === 'IN_REVIEW') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-6 bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Verification Pending</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your documents are being reviewed. This usually takes 1-2 business days.
                </p>
                {status.submittedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted on {new Date(status.submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl font-medium hover:bg-zinc-50 transition-colors"
          >
            <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh Status
          </button>
        </div>
      );
    }

    if (status.status === 'REJECTED') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-6 bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Verification Rejected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {status.sumsub?.moderationComment || 'Your verification was not approved. Please try again with valid documents.'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => startKyc()}
            disabled={starting}
            className="w-full px-6 py-3 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </span>
            ) : (
              'Try Again'
            )}
          </button>
        </div>
      );
    }
  }

  // Show start verification button if not started
  if (!accessToken && !loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 bg-card border border-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-zinc-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Identity Verification Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Complete KYC verification to invest in solar projects and receive yield distributions.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Government-issued ID (Passport or Driver's License)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Selfie verification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Takes only 2-3 minutes
                </li>
              </ul>
            </div>
          </div>
        </div>

        {(error || widgetError) && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error || widgetError}
          </div>
        )}

        <button
          onClick={() => startKyc()}
          disabled={starting}
          className="w-full px-6 py-3 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {starting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting Verification...
            </span>
          ) : (
            'Start Verification'
          )}
        </button>
      </div>
    );
  }

  // Show loading state - only show full screen loader if we don't have a status yet
  // to prevent flickering during background refreshes
  if ((loading && !status) || !sdkLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 relative z-10" />
        <p className="mt-6 text-sm font-medium text-zinc-500 tracking-wide uppercase opacity-70 relative z-10">
          {loading && !status ? 'Fetching verification status' : 'Initializing secure widget'}
        </p>
      </div>
    );
  }

  // Show processing state if submitted but DB not yet updated
  if (isSubmitted && (!status || status.status === 'PENDING')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center relative overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-6 mx-auto shadow-inner">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900">Submission Received</h3>
          <p className="mt-3 text-sm text-zinc-600 max-w-xs mx-auto leading-relaxed">
            We've received your documents and are syncing with the verification provider. This should only take a few moments.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-8 px-8 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-50 shadow-sm transition-all duration-200"
          >
            Refresh Now
          </button>
        </div>
      </div>
    );
  }

  // Render Sumsub widget container
  return (
    <div className="space-y-4">
      {widgetError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {widgetError}
        </div>
      )}
      <div 
        ref={containerRef} 
        className="min-h-[500px] rounded-xl overflow-hidden border border-border relative bg-zinc-50"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">
              Connecting to Sumsub Secure Node
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SumsubWidget;
