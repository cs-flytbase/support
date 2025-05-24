'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/utils/supabase/client';

// This page runs after sign-in and stores user data in Supabase
export default function AuthCallbackPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [status, setStatus] = useState('Checking user...');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    // Function to store user in Supabase
    const storeUserInSupabase = async () => {
      if (!isLoaded) {
        setStatus('Loading user data...');
        return;
      }
      
      if (!isSignedIn || !user) {
        setStatus('No user logged in');
        setError('No authenticated user found');
        return;
      }
      
      setStatus(`User loaded: ${user.id}`);
      
      try {
        const supabase = createClient();
        
        // Force a direct insert without checking
        const userData = {
          // Important: Don't include an id field, let Supabase generate it
          email: user.primaryEmailAddress?.emailAddress || 'no-email',
          full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
          avatar_url: user.imageUrl || '',
          clerk_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        };
        
        setStatus('Attempting to insert user...');
        
        // Try to insert - this will fail if the user already exists
        const { data, error: insertError } = await supabase
          .from('users')
          .insert(userData)
          .select();
            
        if (insertError) {
          // Specific error handling
          if (insertError.code === '23505') { // Unique violation
            setStatus('User already exists in database');
            setSuccess(true);
            setTimeout(() => router.push('/'), 2000);
            return;
          }
          
          setStatus('Error inserting user');
          setError(JSON.stringify(insertError));
        } else {
          setStatus('User successfully added to database!');
          setSuccess(true);
          setTimeout(() => router.push('/'), 2000);
        }
      } catch (error) {
        setStatus('Exception occurred');
        setError(JSON.stringify(error));
      }
    };
    
    storeUserInSupabase();
  }, [isLoaded, isSignedIn, user, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md p-6 bg-white shadow-md rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Auth Callback</h2>
        
        <div className="mb-4 p-3 bg-gray-100 rounded text-left">
          <p className="font-medium">Status: {status}</p>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm overflow-auto max-h-40">
              <p className="font-bold">Error:</p>
              <pre>{error}</pre>
            </div>
          )}
        </div>
        
        {success ? (
          <p className="text-green-600">Redirecting you shortly...</p>
        ) : (
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Homepage
          </button>
        )}
      </div>
    </div>
  );
}
