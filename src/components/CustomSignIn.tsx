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
        // Check if user already exists in the database
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking user:', error);
          return;
        }

        // If user doesn't exist, create a new record
        if (!data) {
          const primaryEmail = user.primaryEmailAddress?.emailAddress;
          
          if (!primaryEmail) {
            console.error('User has no primary email');
            return;
          }

          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
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
