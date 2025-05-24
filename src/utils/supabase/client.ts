import { createBrowserClient } from '@supabase/ssr';
import { Database } from './server';

/**
 * Creates a Supabase client for use in the browser
 * This is used in client components
 */
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
