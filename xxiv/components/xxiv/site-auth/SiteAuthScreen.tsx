'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase-browser';

type SiteContext = {
  id: string;
  name: string;
  slug: string;
  live_url: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean | null;
};

type Mode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

async function validateMembership(
  supabase: SupabaseClient,
  siteId: string,
): Promise<{ valid: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    return { valid: false, error: 'No active session' };
  }

  const response = await fetch(`/api/xxiv/site-auth/validate?site_id=${encodeURIComponent(siteId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.valid) {
    return { valid: false, error: data.error || 'No account found for this site' };
  }

  return { valid: true };
}

export default function SiteAuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const siteIdFromQuery = searchParams.get('site_id') || searchParams.get('xxiv_site_id') || '';

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [site, setSite] = useState<SiteContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const authQueryString = useMemo(() => {
    const params = new URLSearchParams();

    if (redirectTo && redirectTo !== '/') {
      params.set('redirect', redirectTo);
    }

    if (siteIdFromQuery) {
      params.set('site_id', siteIdFromQuery);
    }

    const query = params.toString();
    return query ? `?${query}` : '';
  }, [redirectTo, siteIdFromQuery]);
  const postAuthRedirect = useMemo(() => {
    if (redirectTo && redirectTo !== '/') {
      return redirectTo;
    }

    const targetSiteId = site?.id || siteIdFromQuery;
    return targetSiteId ? `/?xxiv_site_id=${encodeURIComponent(targetSiteId)}` : '/';
  }, [redirectTo, site?.id, siteIdFromQuery]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const contextUrl = new URL('/api/xxiv/site-auth/context', window.location.origin);
        if (siteIdFromQuery) {
          contextUrl.searchParams.set('site_id', siteIdFromQuery);
        }

        const [client, siteResponse] = await Promise.all([
          createBrowserClient(),
          fetch(contextUrl.toString()),
        ]);

        if (!active) return;

        setSupabase(client);

        if (!siteResponse.ok) {
          setError('Site context is unavailable.');
          return;
        }

        const siteData = await siteResponse.json();
        if (!active) return;
        setSite(siteData.data || null);
      } catch (bootError) {
        if (!active) return;
        setError(bootError instanceof Error ? bootError.message : 'Failed to initialize auth');
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [siteIdFromQuery]);

  useEffect(() => {
    if (mode !== 'reset-password' || !supabase) {
      return;
    }

    void (async () => {
      const code = new URL(window.location.href).searchParams.get('code');
      if (!code) {
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(exchangeError.message);
      }
    })();
  }, [mode, supabase]);

  const title = useMemo(() => {
    switch (mode) {
      case 'signup':
        return 'Create your account';
      case 'forgot-password':
        return 'Reset your password';
      case 'reset-password':
        return 'Choose a new password';
      default:
        return 'Sign in to continue';
    }
  }, [mode]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!site) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/xxiv/site-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: site.id,
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.replace(postAuthRedirect);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to reach the authentication service',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !site) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/xxiv/site-auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: site.id,
          email: email.trim(),
          password,
          full_name: fullName.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === 'account_exists_same_site') {
          setError(data.error || 'This email already has an account. Log in instead, or use Forgot password.');
        } else if (data.code === 'account_exists_other_site') {
          setError(data.error || 'This email is already registered on another site.');
        } else {
          setError(data.error || 'Signup failed');
        }
        return;
      }

      const loginResponse = await fetch('/api/xxiv/site-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: site.id,
          email: email.trim(),
          password,
        }),
      });

      const loginData = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok) {
        setError(loginData.error || 'Login failed after signup');
        return;
      }

      router.replace(postAuthRedirect);
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/xxiv-auth/reset-password${authQueryString}`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage('Check your email for a reset link.');
    } catch (forgotError) {
      setError(forgotError instanceof Error ? forgotError.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage('Password updated. Redirecting back to your site...');
      setTimeout(() => router.replace(postAuthRedirect), 800);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not update password');
    } finally {
      setLoading(false);
    }
  }

  const shellClassName = 'min-h-screen bg-[#0a0a0a] px-6 py-10 text-white';
  const cardClassName = 'mx-auto flex min-h-[70vh] max-w-md items-center justify-center';
  const panelClassName = 'w-full rounded-[28px] border border-white/10 bg-[#111111] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)]';
  const inputClassName = 'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30';
  const secondaryLinkClassName = 'text-sm text-white/70 transition hover:text-white';
  const primaryButtonClassName = 'w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <main className={shellClassName} style={{ fontFamily: '"DM Sans", sans-serif' }}>
      <div className={cardClassName}>
        <div className={panelClassName}>
          <div className="mb-8">
            <div className="mb-2 text-xs uppercase tracking-[0.35em] text-white/35">XXIV</div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">{site?.name || 'Site Access'}</h1>
            <p className="mt-3 text-sm text-white/60">{title}</p>
          </div>

          {booting && <p className="text-sm text-white/60">Loading...</p>}
          {!booting && error && <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          {!booting && message && <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div>}

          {!booting && mode === 'login' && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <input className={inputClassName} type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input className={inputClassName} type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className={primaryButtonClassName} type="submit" disabled={loading || !supabase || !site}>
                {loading ? 'Signing in...' : 'Log In'}
              </button>
              <div className="flex items-center justify-between gap-4">
                <Link href={`/xxiv-auth/forgot-password${authQueryString}`} className={secondaryLinkClassName}>Forgot password?</Link>
                <Link href={`/xxiv-auth/signup${authQueryString}`} className={secondaryLinkClassName}>Create account</Link>
              </div>
            </form>
          )}

          {!booting && mode === 'signup' && (
            <form className="space-y-4" onSubmit={handleSignup}>
              <input className={inputClassName} type="text" placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              <input className={inputClassName} type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input className={inputClassName} type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className={primaryButtonClassName} type="submit" disabled={loading || !supabase || !site}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
              <Link href={`/xxiv-auth/login${authQueryString}`} className={secondaryLinkClassName}>Already have an account?</Link>
            </form>
          )}

          {!booting && mode === 'forgot-password' && (
            <form className="space-y-4" onSubmit={handleForgotPassword}>
              <input className={inputClassName} type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <button className={primaryButtonClassName} type="submit" disabled={loading || !supabase}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <Link href={`/xxiv-auth/login${authQueryString}`} className={secondaryLinkClassName}>Back to login</Link>
            </form>
          )}

          {!booting && mode === 'reset-password' && (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <input className={inputClassName} type="password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <input className={inputClassName} type="password" placeholder="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              <button className={primaryButtonClassName} type="submit" disabled={loading || !supabase}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
