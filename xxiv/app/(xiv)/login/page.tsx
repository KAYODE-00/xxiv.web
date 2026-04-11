'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  } as React.CSSProperties,

  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '40px 36px',
    backdropFilter: 'blur(20px)',
  } as React.CSSProperties,

  logo: {
    fontFamily: 'var(--font-bebas-neue), "Bebas Neue", sans-serif',
    fontSize: '42px',
    letterSpacing: '0.08em',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: '8px',
    lineHeight: 1,
  } as React.CSSProperties,

  heading: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: '6px',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,

  subheading: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginBottom: '32px',
  } as React.CSSProperties,

  formGroup: {
    marginBottom: '16px',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: '8px',
    letterSpacing: '0.01em',
  } as React.CSSProperties,

  inputWrapper: {
    position: 'relative',
  } as React.CSSProperties,

  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '15px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-dm-sans), sans-serif',
  } as React.CSSProperties,

  inputWithToggle: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '12px 44px 12px 16px',
    fontSize: '15px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-dm-sans), sans-serif',
  } as React.CSSProperties,

  toggleBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.4)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
  } as React.CSSProperties,

  forgotLink: {
    display: 'block',
    textAlign: 'right',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    marginTop: '8px',
    transition: 'color 0.2s',
  } as React.CSSProperties,

  primaryBtn: {
    width: '100%',
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    borderRadius: '10px',
    padding: '13px 16px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.01em',
    transition: 'background 0.2s, transform 0.1s',
    marginTop: '24px',
    fontFamily: 'var(--font-dm-sans), sans-serif',
  } as React.CSSProperties,

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
  } as React.CSSProperties,

  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
  } as React.CSSProperties,

  dividerText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    fontWeight: 500,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  googleBtn: {
    width: '100%',
    background: 'transparent',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'background 0.2s, border-color 0.2s',
    fontFamily: 'var(--font-dm-sans), sans-serif',
  } as React.CSSProperties,

  footer: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
  } as React.CSSProperties,

  footerLink: {
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: 500,
    marginLeft: '4px',
  } as React.CSSProperties,

  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#fca5a5',
    marginBottom: '20px',
    lineHeight: 1.5,
  } as React.CSSProperties,

  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#000',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  } as React.CSSProperties,
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  // Parse error from URL (e.g., after OAuth redirect)
  useEffect(() => {
    const urlError = new URLSearchParams(window.location.search).get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, []);

  // Initialize Supabase client
  useEffect(() => {
    import('@/lib/supabase-browser').then(({ createBrowserClient }) => {
      createBrowserClient().then(setSupabase);
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) return;

    setError('');
    setGoogleLoading(true);

    try {
      const origin = window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
      // On success, browser redirects to Google — no cleanup needed
    } catch {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25); }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff;
          -webkit-box-shadow: 0 0 0px 1000px rgba(255,255,255,0.06) inset;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <main style={styles.page}>
        <div style={styles.card}>
          {/* Logo */}
          <div style={styles.logo}>XXIV</div>

          {/* Heading */}
          <h1 style={styles.heading}>Welcome back</h1>
          <p style={styles.subheading}>Sign in to your account</p>

          {/* Error */}
          {error && <div style={styles.error}>{error}</div>}

          {/* Form */}
          <form onSubmit={handleLogin} noValidate>
            <div style={styles.formGroup}>
              <label htmlFor="login-email" style={styles.label}>Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="login-password" style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputWithToggle}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                />
                <button
                  type="button"
                  style={styles.toggleBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <Link href="/forgot-password" style={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading || !supabase}
              style={{
                ...styles.primaryBtn,
                opacity: loading || !supabase ? 0.7 : 1,
                cursor: loading || !supabase ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = '#e5e5e5'; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#ffffff'; }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={styles.spinner} />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Google */}
          <button
            id="login-google"
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              ...styles.googleBtn,
              opacity: googleLoading ? 0.6 : 1,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!googleLoading) (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Footer */}
          <p style={styles.footer}>
            Don&apos;t have an account?
            <Link href="/signup" style={styles.footerLink}>Sign up</Link>
          </p>
        </div>
      </main>
    </>
  );
}
