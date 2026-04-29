import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { credentials } from '@/lib/credentials';
import { parseSupabaseConfig } from '@/lib/supabase-config-parser';
import type { SupabaseConfig } from '@/types';

type PendingCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * GET /xxiv/api/auth/callback
 *
 * Handles OAuth callback from Supabase Auth for the builder.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const config = await credentials.get<SupabaseConfig>('supabase_config');

    if (!config) {
      return NextResponse.redirect(new URL('/login?error=config', request.url));
    }

    const parsed = parseSupabaseConfig(config);
    const cookieJar = new Map(
      request.cookies.getAll().map((cookie) => [cookie.name, { name: cookie.name, value: cookie.value }]),
    );
    const pendingCookies = new Map<string, PendingCookie>();

    const buildRedirectResponse = (path: string) => {
      const response = NextResponse.redirect(new URL(path, request.url));

      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set({ name, value, ...(options ?? {}) });
      });

      return response;
    };

    const supabase = createServerClient(parsed.projectUrl, parsed.anonKey, {
      cookies: {
        getAll() {
          return Array.from(cookieJar.values());
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieJar.set(name, { name, value });
            pendingCookies.set(name, {
              name,
              value,
              options: (options as Record<string, unknown> | undefined) ?? undefined,
            });
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return buildRedirectResponse('/login?error=auth');
    }

    return buildRedirectResponse('/xxiv');
  } catch (error) {
    console.error('Auth callback failed:', error);
    return NextResponse.redirect(new URL('/login?error=server', request.url));
  }
}
