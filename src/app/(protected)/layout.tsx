'use client';

import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';
import { Toaster } from 'react-hot-toast';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  
  // Function to sync user with Supabase
  useEffect(() => {
    // Only run this effect when user data is loaded and user is signed in
    if (!isLoaded || !isSignedIn || !user) return;
    
    const syncUserWithSupabase = async () => {
      try {
        // Use the centralized user creation function
        const { ensureSupabaseUser } = await import('@/utils/auth');
        await ensureSupabaseUser(user);
        console.log('User successfully verified in Supabase');
      } catch (error) {
        console.error('Error syncing user with Supabase:', error);
      }
    };
    
    // Execute the sync function
    syncUserWithSupabase();
  }, [isLoaded, isSignedIn, user]); // Only re-run if these dependencies change
  
  // Render the protected content
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto py-4 px-3 sm:py-6 sm:px-4 md:px-6 lg:px-8 overflow-y-auto ">
        {children}
      </main>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </div>
  );
}
