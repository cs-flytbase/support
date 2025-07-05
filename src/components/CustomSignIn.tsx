'use client';

import { useEffect } from 'react';
import { SignIn, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function CustomSignIn() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const supabase = createClient();

  // Handle user data synchronization after successful sign-in
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const syncUserToSupabase = async () => {
      try {
        // Use the centralized user creation function
        const { ensureSupabaseUser } = await import('@/utils/auth');
        await ensureSupabaseUser(user);
        console.log('User successfully verified in Supabase');

        // Redirect to the main app page after sign-in and sync
        router.push('/');
      } catch (err) {
        console.error('Error in user sync process:', err);
      }
    };

    syncUserToSupabase();
  }, [isLoaded, isSignedIn, user, supabase, router]);

  return <SignIn />;
}
