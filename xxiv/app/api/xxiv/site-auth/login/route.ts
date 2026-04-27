import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { credentials } from '@/lib/credentials';
import { parseSupabaseConfig } from '@/lib/supabase-config-parser';
import type { SupabaseConfig } from '@/types';
import { validateSiteUserSession } from '@/lib/xxiv/site-auth-service';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const siteId = typeof body?.site_id === 'string' ? body.site_id : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!siteId || !email || !password) {
    return NextResponse.json(
      { error: 'site_id, email, and password are required' },
      { status: 400 },
    );
  }

  const config = await credentials.get<SupabaseConfig>('supabase_config');
  if (!config) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
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

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      const message = error?.message?.toLowerCase() || '';
      const isInvalidCredentials =
        message.includes('invalid login credentials')
        || message.includes('email not confirmed')
        || message.includes('invalid credentials');

      return NextResponse.json(
        {
          error: isInvalidCredentials
            ? 'Invalid email or password'
            : error?.message || 'Login failed',
        },
        { status: 401 },
      );
    }

    const membership = await validateSiteUserSession(siteId, data.user.id);
    if (!membership.valid) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'No account found for this site' },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Unable to reach the authentication service',
      },
      { status: 502 },
    );
  }
}
