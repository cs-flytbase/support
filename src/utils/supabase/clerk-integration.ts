import { auth } from '@clerk/nextjs/server';
import { createClient } from './server';

/**
 * Creates a Supabase client with the current user's Clerk session
 * This allows Supabase RLS policies to work with Clerk user IDs
 * 
 * Row-level security in Supabase can use the Clerk user ID to restrict data access
 * by comparing it to a user_id column in your tables
 */
export async function createClientWithAuth() {
  // Get Clerk authentication information from the server-side auth helper
  const { userId } = await auth();
  
  // Create a Supabase client
  const supabase = createClient();
  
  // Apply any special handling for Supabase RLS policies
  if (userId) {
    // For debugging purposes - you can remove this in production
    console.log('Using Clerk user for Supabase:', userId);
    
    // You can optionally use any special Supabase settings here
    // For example, if you have RLS policies that check for specific headers:
    // await supabase.rpc('set_claim', { name: 'user_id', value: userId });
  }
  
  return supabase;
}
