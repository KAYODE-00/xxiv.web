import 'server-only';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { credentials } from '@/lib/credentials';
import { parseSupabaseConfig } from '@/lib/supabase-config-parser';
import type { SupabaseConfig } from '@/types';
import { redirect } from 'next/navigation';

export async function createDashboardClient() {
  const config = await credentials.get<SupabaseConfig>('supabase_config');

  if (!config) {
    throw new Error('Supabase not configured');
  }

  const parsed = parseSupabaseConfig(config);
  const cookieStore = await cookies();

  return createSSRClient(parsed.projectUrl, parsed.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Cookies can only be set in Server Actions/Route Handlers, not Server Components
        // This is silently ignored in layouts; auth refresh should happen in Route Handlers
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Silently fail if cookies can't be set (e.g., in server components)
        }
      },
    },
  });
}

export async function getAuthUser() {
  try {
    const supabase = await createDashboardClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireAuthUser() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  return user;
}
