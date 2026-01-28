'use client';

import { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { fetchApi } from '@/lib/api';

/**
 * Component to synchronize Clerk user state with our backend
 */
export function AuthSync() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && isSignedIn && user) {
        try {
          const token = await getToken();
          if (!token) return;

          // Sync user with backend
          await fetchApi('/auth/sync', token, {
            method: 'POST',
            body: JSON.stringify({
              email: user.primaryEmailAddress?.emailAddress,
              name: user.fullName,
              // Note: role could be pulled from publicMetadata if already set
              role: user.publicMetadata.role || 'INVESTOR',
            }),
          });
          
          console.log('User synced successfully');
        } catch (error) {
          console.error('Failed to sync user:', error);
        }
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user, getToken]);

  return null;
}
