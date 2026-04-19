import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { credentials } from '@/lib/credentials';
import { parseSupabaseConfig } from '@/lib/supabase-config-parser';
import type { SupabaseConfig } from '@/types';




/**
 * GET /auth/callback
 *
 * Handles two flows:
 * 1. OAuth code exchange (Google, etc.) — ?code=...
 * 2. Email magic link / password reset — ?token_hash=...&type=...
 *
 * On success: redirects to /dashboard
 * On error:   redirects to /login?error=...
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
    const cookieStore = await cookies();

    const supabase = createServerClient(parsed.projectUrl, parsed.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        },
      },
    });

    // Flow 1: OAuth code exchange
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[auth/callback] OAuth code exchange failed:', error.message);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
        );
      }

      return NextResponse.redirect(new URL(next, origin));
    }

    // Flow 2: Email magic link / password reset token
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'email' | 'recovery' | 'signup' | 'invite' | 'magiclink',
      });

      if (error) {
        console.error('[auth/callback] Token verification failed:', error.message);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
        );
      }

      // Password reset: send to update-password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/update-password', origin));
      }

      return NextResponse.redirect(new URL(next, origin));
    }

    // No code or token — redirect to login
    return NextResponse.redirect(new URL('/login', origin));
  } catch (error) {
    console.error('[auth/callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/login?error=server', origin));
  }
}
