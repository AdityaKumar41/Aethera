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
          console.log('Applicant submitted');
          refetch();
        })
        .on('idCheck.onApplicantResubmitted', () => {
          console.log('Applicant resubmitted');
          refetch();
        })
        .on('idCheck.onApplicantStatusChanged', (payload: any) => {
          console.log('Status changed:', payload);
          if (payload.reviewAnswer === 'GREEN') {
            onComplete?.();
            refetch();
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
  }, [sdkLoaded, accessToken, startKyc, refetch, onComplete, onError]);

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

  // Show loading state
  if (loading || !sdkLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          {loading ? 'Loading verification status...' : 'Loading verification widget...'}
        </p>
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
        className="min-h-[500px] rounded-xl overflow-hidden border border-border"
      />
    </div>
  );
}

export default SumsubWidget;
