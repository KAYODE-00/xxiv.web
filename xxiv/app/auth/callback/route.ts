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
 * GET /auth/callback
 *
 * Handles two flows:
 * 1. OAuth code exchange (Google, etc.) - ?code=...
 * 2. Email magic link / password reset - ?token_hash=...&type=...
 *
 * On success: redirects to /dashboard
 * On error: redirects to /login?error=...
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  try {
    const config = await credentials.get<SupabaseConfig>('supabase_config');

    if (!config) {
      return NextResponse.redirect(new URL('/login?error=config', origin));
    }

    const parsed = parseSupabaseConfig(config);
    const cookieJar = new Map(
      request.cookies.getAll().map((cookie) => [cookie.name, { name: cookie.name, value: cookie.value }]),
    );
    const pendingCookies = new Map<string, PendingCookie>();

    const buildRedirectResponse = (path: string) => {
      const response = NextResponse.redirect(new URL(path, origin));

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

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[auth/callback] OAuth code exchange failed:', error.message);
        return buildRedirectResponse(`/login?error=${encodeURIComponent(error.message)}`);
      }

      return buildRedirectResponse(next);
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'email' | 'recovery' | 'signup' | 'invite' | 'magiclink',
      });

      if (error) {
        console.error('[auth/callback] Token verification failed:', error.message);
        return buildRedirectResponse(`/login?error=${encodeURIComponent(error.message)}`);
      }

      if (type === 'recovery') {
        return buildRedirectResponse('/update-password');
      }

      return buildRedirectResponse(next);
    }

    return buildRedirectResponse('/login');
  } catch (error) {
    console.error('[auth/callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/login?error=server', origin));
  }
}
