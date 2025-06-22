"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import React from 'react'
import { toast, Toaster } from 'react-hot-toast'

import { useAuth } from '@clerk/nextjs'
import { createClient } from '@/utils/supabase/client'

// Define Handbook type
interface Handbook {
  id: string;
  user_id: string;
  prompt: string;
  html_content: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  title?: string; // Optional title
  status: 'pending' | 'completed' | 'error'; // Status of the handbook generation
}

export default function HandbookPage({ params }: { params: any }) {
  // Add timestamp to track when handbook was last updated for animation triggers
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  // Track if we're polling for updates
  const [polling, setPolling] = useState<boolean>(false)
  // Properly unwrap params using React.use() with type assertion
  const unwrappedParams = React.use(params) as { id: string };
  const handbookId = unwrappedParams.id;
  const router = useRouter()
  const { userId, isLoaded: isAuthLoaded } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [handbook, setHandbook] = useState<Handbook | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [supabase] = useState(() => createClient())

  // Load handbook data when params or user changes
  useEffect(() => {
    loadHandbookData()
  }, [handbookId, userId, router])
  
  // Start polling when handbook is loaded and not published
  useEffect(() => {
    console.log('📝 Handbook state changed:', handbook);
    console.log('📝 Is published:', handbook?.is_published);
    
    if (handbook && !handbook.is_published) {
      console.log('📣 Handbook is not published yet, starting polling...');
      const cleanup = startPolling();
      return cleanup;
    }
  }, [handbook])
  

  
  // Start polling for updates as a backup to real-time subscription
  const startPolling = () => {
    if (polling) return // Don't start multiple polling intervals
    
    console.log('📡 Starting polling for handbook updates...');
    setPolling(true);
    
    // Poll every 3 seconds
    const pollInterval = setInterval(() => {
      if (!handbookId) return;
      
      console.log('🔄 Polling for handbook updates...');
      // Fetch latest handbook data
      supabase
        .from('solution_handbooks')
        .select('*')
        .eq('id', handbookId)
        .limit(1)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error polling handbook:', error);
            return;
          }
          
          if (data) {
            console.log('📊 Polled data:', data);
            // Check if anything important changed
            const updatedHandbook = data as Handbook;
            setHandbook(prevHandbook => {
              if (!prevHandbook) return updatedHandbook;
              
              // Check specifically for published status changes
              if (!prevHandbook.is_published && updatedHandbook.is_published) {
                console.log('🎉 Handbook now published (from polling)!');
                toast.success('Your handbook is now published!', {
                  duration: 5000, 
                  position: 'top-center',
                  icon: '🎉'
                });
                // Update timestamp to force UI refresh
                setLastUpdated(Date.now());
              }
              
              return updatedHandbook;
            });
          }
        });
    }, 3000); // Poll every 3 seconds
    
    // Clean up polling on component unmount
    return () => {
      console.log('Stopping polling');
      clearInterval(pollInterval);
      setPolling(false);
    };
  }

  // Set up real-time subscription for handbook updates
  useEffect(() => {
    if (!handbookId || !supabase) return;
    
    console.log('Setting up Supabase Realtime subscription for handbook:', handbookId);
    
    // Create a consistent channel name based on handbook ID for stable subscriptions
    const channelName = `handbook-${handbookId}`;
    console.log(`Creating channel: ${channelName}`);
    
    // Note: We're assuming the database has been configured properly by your admin
    // In production, the solution_handbooks table should have REPLICA IDENTITY FULL
    // and be added to the supabase_realtime publication
    
    // Create channel for this handbook with all event types
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'solution_handbooks',
          filter: `id=eq.${handbookId}`
        },
        (payload) => {
          console.log('Handbook change detected:', payload);
          
          // Handle different event types
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedHandbook = payload.new as Handbook;
            console.log('Updated handbook data:', updatedHandbook);
            
            // Check for important changes
            const wasPublished = !handbook?.is_published && updatedHandbook.is_published;
            
            // Always update the state with new data
            setHandbook(updatedHandbook);
            setLastUpdated(Date.now());
            
            // Show notification when handbook is published
            if (wasPublished) {
              console.log('🎉 HANDBOOK PUBLISHED! Showing notification');
              toast.success('Your handbook is now published!', {
                duration: 5000,
                position: 'top-center',
                icon: '🎉'
              });
            }
          }
          else if (payload.eventType === 'INSERT' && payload.new) {
            console.log('New handbook data inserted');
            setHandbook(payload.new as Handbook);
            setLastUpdated(Date.now());
          }
          else if (payload.eventType === 'DELETE') {
            console.log('Handbook deleted');
            setError('This handbook has been deleted');
          }
        }
      )
      .subscribe(status => {
        console.log(`Subscription status for handbook ${handbookId}:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to handbook updates!');
          // Request fresh data once subscription is established
          loadHandbookData();
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error:', status);
          // Fall back to polling if channel has an error
          if (!polling) startPolling();
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Channel subscription timed out');
        }
      });
    
    // Clean up subscription when component unmounts
    return () => {
      console.log(`Cleaning up subscription for handbook ${handbookId}`);
      supabase.removeChannel(channel);
    };
  }, [handbookId, supabase])

  // Enhanced loadHandbook function with proper auth state handling
  async function loadHandbookData() {
    try {
      // Only check auth status if Clerk has finished loading
      if (isAuthLoaded) {
        setAuthChecking(false)
        
        // Only redirect if auth is loaded AND user is not signed in
        if (!userId) {
          console.log('User not authenticated, redirecting to sign-in')
          router.push('/sign-in')
          return
        }
      } else {
        // Auth still loading, don't try to fetch data yet
        console.log('Auth still loading, waiting...')
        return
      }
      
      console.log(`Fetching handbook with ID: ${handbookId}`)
      
      // Direct Supabase query similar to calls page
      const { data, error: handbookError } = await supabase
        .from('solution_handbooks')
        .select('*')
        .eq('id', handbookId)
        .limit(1)
      console.log(data)
      if (handbookError) {
        console.error('Error fetching handbook:', handbookError)
        throw handbookError
      }
      
      if (!data || data.length === 0) {
        console.log(`No handbook found with ID: ${handbookId}`)
        setError(`Handbook with ID ${handbookId} not found`)
        return
      }
      
      // Use the first result
      const newHandbook = data[0];
      console.log('📔 Loaded handbook data:', newHandbook);
      
      // Check if this is a meaningful update
      if (JSON.stringify(newHandbook) !== JSON.stringify(handbook)) {
        console.log('📄 Updating handbook with new data');
        setHandbook(newHandbook);
        setLastUpdated(Date.now());
        
        // Check if handbook is now published
        if (handbook && !handbook.is_published && newHandbook.is_published) {
          console.log('✨ Handbook is now published! (from load)');
          toast.success('Your handbook is now published!', {
            duration: 5000, 
            position: 'top-center',
            icon: '🎉'
          });
        }
      }
    } catch (err: any) {
      console.error('Error loading handbook:', err)
      setError(err.message || 'Failed to load handbook')
    } finally {
      setLoading(false)
    }
  }

  // Show auth checking state
  if (!isAuthLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg mb-2">Checking authentication...</p>
          <div className="animate-pulse h-2 w-24 bg-gray-200 mx-auto rounded"></div>
        </div>
      </div>
    )
  }
  
  // Show loading state when initially loading or when handbook exists but not published yet
  if (loading || (handbook && !handbook.is_published)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg mb-2">Loading your solution handbook...</p>
          <div className="animate-pulse h-2 w-24 bg-gray-200 mx-auto rounded"></div>
          {handbook && !handbook.is_published && (
            <div className="mt-6">
              <p className="text-gray-600 mb-3">Your handbook is being generated. This may take a minute...</p>
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div 
                    style={{ width: "100%" }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 animate-pulse">
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {polling ? "Polling for updates... " : ""}
                Waiting for handbook to be published...
              </p>
              <button
                onClick={() => loadHandbookData()}
                className="mt-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-md text-sm"
              >
                Check for updates manually
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 text-red-700 p-6 rounded-md max-w-md">
          <h1 className="text-xl font-bold mb-2">Error</h1>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/solution-handbooks')}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md"
          >
            Back to Solution Handbooks
          </button>
        </div>
      </div>
    )
  }

  if (!handbook) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg mb-2">Handbook not found</p>
          <button 
            onClick={() => router.push('/solution-handbooks')}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Back to Solution Handbooks
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Add Toaster for notifications */}
      <Toaster />
      
      {/* Key the content with lastUpdated to trigger re-renders when data changes */}
      <div key={`handbook-${handbookId}-${lastUpdated}`} className="max-w-4xl mx-auto transition-all duration-500 ease-in-out">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">{handbook.title || 'Solution Handbook'}</h1>
          <div className="mt-2 sm:mt-0">
            <button 
              onClick={() => router.push('/solution-handbooks')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Back to Handbooks
            </button>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Your prompt:</h2>
          <p className="whitespace-pre-wrap">{handbook.prompt}</p>
        </div>
        
        <div className="prose prose-gray max-w-none dark:prose-invert">
          {/* Render HTML content safely */}
          {handbook.html_content ? (
            <div dangerouslySetInnerHTML={{ __html: handbook.html_content }} />
          ) : (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
              <p>Content is still being generated. It will appear here once ready.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
