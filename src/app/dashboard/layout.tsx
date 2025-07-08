'use client';

import MinimalistDock from "@/components/ui/minimal-dock";
import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Navigation from '@/components/Navigation';
import { Toaster } from 'react-hot-toast';
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import Calendarprod from "./components/Calendarprod"
import MessageDoc from "./components/MessageDoc"

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
     <div className="  flex-col items-center justify-center h-screen text-white bg-transparent">
     <div className="[--header-height:calc(--spacing(14))] bg-black">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex  flex-col gap-4 p-4">
              {/* <div className="bg-black rounded-lg p-6">
                <SyncDashboard />
              </div> */}
              {/* <GooeyDemo /> */}
        {children}
              
              <MessageDoc />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
     </div>
   

       
     
     
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </div>
  );
}
