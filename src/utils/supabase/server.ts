import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

// Define the Database types for Supabase
export type Database = {
  public: {
    Tables: {
      instruments: {
        Row: {
          id: number;
          name: string;
        }
      }
    }
  }
}

// Create a cached version of the Supabase client to improve performance
export const createClient = cache(() => {
  // Explicitly cast cookies() to avoid TypeScript errors
  const cookieStore = cookies() as any;
  
  // Create and return the Supabase client
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // TypeScript safe way to access cookies
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set(name: string, value: string, options: { path?: string; domain?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; }) {
          // In Server Components, we can't set cookies directly
          // Using try/catch to handle this safely
          try {
            // @ts-ignore - Next.js cookies() has a different type than what ssr expects
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Silent fail - this is expected in Server Components
          }
        },
        remove(name: string, options: { path?: string; domain?: string; }) {
          try {
            // @ts-ignore - Next.js cookies() has a different type than what ssr expects
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Silent fail - this is expected in Server Components
          }
        },
      },
    }
  );
});
