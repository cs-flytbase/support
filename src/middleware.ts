import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Define public routes - ONLY sign-in and static assets
const publicRoutes = [
  '/sign-in(.*)',              // Sign-in pages (catches all nested routes)
  '/sign-up(.*)',              // Sign-up pages (catches all nested routes)
  '/_next/static/(.*)',        // Static assets
  '/_next/image/(.*)',         // Image assets
  '/api/webhooks/(.*)',        // Webhook routes
  '/favicon.ico',              // Favicon
];

// Helper function to check if a route is public
const isPublicRoute = (req: NextRequest) => {
  const path = req.nextUrl.pathname;
  return publicRoutes.some(route => {
    // Convert glob pattern to regex
    const pattern = route.replace(/\(\*\)/g, '.*').replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
};

/**
 * Syncs the Clerk user with Supabase database
 */
async function syncClerkUserWithSupabase(req: NextRequest) {
  try {
    // Use auth object from clerkMiddleware instead of getAuth directly
    // This ensures we're using the middleware context
    const auth = req.headers.get('clerk-auth-state');
    if (!auth) return;
    
    const authState = JSON.parse(auth);
    const userId = authState?.userId;
    
    // Skip if no user is authenticated
    if (!userId) return;
    
    // Get full user data from session (includes email, name, etc.)
    const userInfo = req.headers.get('x-clerk-user');
    if (!userInfo) return;
    
    const user = JSON.parse(userInfo);
    const primaryEmail = user.email_addresses?.[0]?.email_address;
    
    if (!primaryEmail) return;
    
    // Create Supabase client (server-side)
    const supabase = createClient();
    
    // Check if user exists in Supabase
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single();
    
    if (queryError && queryError.code !== 'PGRST116') {
      // Not handling the error loudly as middleware should continue even if DB sync fails
      console.error('Error querying user:', queryError);
      return;
    }
    
    // If user doesn't exist, create them
    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId, // Using Clerk ID as the primary key
          email: primaryEmail,
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          avatar_url: user.image_url,
          clerk_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating user in Supabase:', insertError);
      }
    }
  } catch (error) {
    // Log error but don't block the request - authentication still works via Clerk
    console.error('Error syncing user with Supabase:', error);
  }
}

// Export the Clerk middleware with our custom routing logic
export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Check if the current route is a public route (sign-in or static assets)
  if (isPublicRoute(req)) {
    // For public routes, allow the request to proceed
    return NextResponse.next();
  }
  
  try {
    // For protected routes, use auth.protect() with no options
    // We'll manually handle redirections for better control
    await auth.protect();
    
    // If we get here, the user is authenticated with Clerk
    // Let's also make sure they exist in our Supabase database
    await syncClerkUserWithSupabase(req);

    // Allow the request to proceed
    return NextResponse.next();
  } catch (error) {
    // If there's an error, redirect to sign-in
    console.error('Authentication error:', error);
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
});

// Configure which routes this middleware will run on
export const config = {
  matcher: [
    // Match all routes in the (protected) folder
    '/(protected)/:path*',
    // Match all API routes
    '/api/:path*',
    // Match all other routes except static assets and auth pages
    '/((?!_next/static|_next/image|favicon.ico|sign-in|sign-up|api/webhooks).*)'
  ],
};