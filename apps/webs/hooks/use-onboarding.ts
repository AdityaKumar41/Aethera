"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { userApi } from "@/lib/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  kycStatus: string;
  stellarPubKey: string | null;
  company?: string | null;
  country?: string | null;
}

interface OnboardingStatus {
  isComplete: boolean;
  role: string | null;
  loading: boolean;
  user: UserProfile | null;
  walletAddress: string | null;
  kycStatus: string | null;
}

export function useOnboardingStatus(): OnboardingStatus {
  const { user: clerkUser, isLoaded } = useUser();
  const [status, setStatus] = useState<OnboardingStatus>({
    isComplete: false,
    role: null,
    loading: true,
    user: null,
    walletAddress: null,
    kycStatus: null,
  });

  useEffect(() => {
    async function checkStatus() {
      if (!isLoaded || !clerkUser) {
        setStatus({ 
          isComplete: false, 
          role: null, 
          loading: !isLoaded,
          user: null,
          walletAddress: null,
          kycStatus: null,
        });
        return;
      }

      try {
        const result = await userApi.getMe();

        if (result.success && result.data) {
          const userData = result.data as UserProfile;
          // User exists in our DB with a role
          setStatus({
            isComplete: userData.role !== 'UNSET',
            role: userData.role,
            loading: false,
            user: userData,
            walletAddress: userData.stellarPubKey,
            kycStatus: userData.kycStatus,
          });
          return;
        }

        // User doesn't exist or API error
        setStatus({
          isComplete: false,
          role: null,
          loading: false,
          user: null,
          walletAddress: null,
          kycStatus: null,
        });
      } catch {
        setStatus({
          isComplete: false,
          role: null,
          loading: false,
          user: null,
          walletAddress: null,
          kycStatus: null,
        });
      }
    }

    checkStatus();
  }, [clerkUser, isLoaded]);

  return status;
}
