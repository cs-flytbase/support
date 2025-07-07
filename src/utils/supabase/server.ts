import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { Database } from './database.types';

// Create a cached version of the Supabase client to improve performance
export const createClient = cache(async () => {
  // Await cookies() to comply with Next.js 15 requirements
  const cookieStore = await cookies();
  
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
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Silent fail - this is expected in Server Components
          }
        },
        remove(name: string, options: { path?: string; domain?: string; }) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Silent fail - this is expected in Server Components
          }
        },
      },
    }
  );
});
