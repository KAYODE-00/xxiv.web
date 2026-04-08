/**
 * XXIV Auth Helpers
 *
 * Server-side utilities for checking and requiring authentication.
 * Wraps the existing getAuthUser() pattern from lib/supabase-auth.ts.
 *
 * SERVER-ONLY: Import only in Server Components, Server Actions, or Route Handlers.
 */

import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase-auth';
import type { User } from '@supabase/supabase-js';

/**
 * Get the current authenticated user.
 * Returns null if not authenticated or Supabase is not configured.
 */
export async function getUser(): Promise<User | null> {
  const result = await getAuthUser();
  return result?.user ?? null;
}

/**
 * Require authentication. Redirects to /login if not authenticated.
 * Returns the authenticated user object if successful.
 *
 * @example
 * // In a Server Component or page:
 * const user = await requireAuth();
 * // Falls through only if logged in, otherwise redirects to /login
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
