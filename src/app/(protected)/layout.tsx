'use client';

import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/utils/supabase/client';
import Navigation from '@/components/Navigation';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  
  // Function to sync user with Supabase
  useEffect(() => {
    // Only run this effect when user data is loaded and user is signed in
    if (!isLoaded || !isSignedIn || !user) return;
    
    const syncUserWithSupabase = async () => {
      try {
        const supabase = createClient();
        
        // Check if user already exists in Supabase
        const { data: existingUser, error: queryError } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', user.id)
          .maybeSingle(); // Use maybeSingle to avoid errors if user doesn't exist
        
        // If user doesn't exist and there's no unexpected error, create the user
        if (!existingUser && !queryError) {
          const primaryEmail = user.primaryEmailAddress?.emailAddress;
          
          if (!primaryEmail) {
            console.error('User has no primary email address');
            return;
          }
          
          // Insert user into Supabase
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id, // Using Clerk ID as the primary key
              email: primaryEmail,
              full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              avatar_url: user.imageUrl,
              clerk_id: user.id
            });
            
          if (insertError) {
            console.error('Error creating user in Supabase:', insertError);
          } else {
            console.log('User successfully created in Supabase');
          }
        }
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
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}
