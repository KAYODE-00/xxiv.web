'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';

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
    lineHeight: 1.5,
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
    transition: 'background 0.2s',
    marginTop: '24px',
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

  // Sent state
  sentIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    margin: '0 auto 24px',
  } as React.CSSProperties,

  sentHeading: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: '12px',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,

  sentBody: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: '32px',
  } as React.CSSProperties,
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    import('@/lib/supabase-browser').then(({ createBrowserClient }) => {
      createBrowserClient().then(setSupabase);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setError('');
    setLoading(true);

    try {
      const origin = window.location.origin;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${origin}/auth/callback?type=recovery&next=/update-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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

          {sent ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center' }}>
              <div style={styles.sentIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h1 style={styles.sentHeading}>Check your inbox</h1>
              <p style={styles.sentBody}>
                We sent a password reset link to{' '}
                <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong>.
                The link expires in 1 hour.
              </p>
              <Link href="/login" style={styles.footerLink}>
                ← Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div style={styles.logo}>XXIV</div>
              <h1 style={styles.heading}>Reset your password</h1>
              <p style={styles.subheading}>
                Enter your email and we&apos;ll send you a reset link
              </p>

              {error && <div style={styles.error}>{error}</div>}

              <form onSubmit={handleSubmit} noValidate>
                <div style={styles.formGroup}>
                  <label htmlFor="forgot-email" style={styles.label}>Email</label>
                  <input
                    id="forgot-email"
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

                <button
                  id="forgot-submit"
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
                      Sending…
                    </span>
                  ) : 'Send reset link'}
                </button>
              </form>

              <p style={styles.footer}>
                Remember your password?
                <Link href="/login" style={styles.footerLink}>Sign in</Link>
              </p>
            </>
          )}

        </div>
      </main>
    </>
  );
}
