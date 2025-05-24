import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

/**
 * Get the authenticated user ID from Clerk
 * This is a wrapper around Clerk's auth() function that provides better error handling
 */
export async function getAuthenticatedUserId() {
  try {
    const authData = await auth();
    return authData.userId;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Check if a user is authenticated
 * Returns the user ID if authenticated, null otherwise
 */
export function isAuthenticated() {
  return getAuthenticatedUserId();
}
