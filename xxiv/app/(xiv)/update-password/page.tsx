'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

  inputWrapper: {
    position: 'relative',
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

  strengthBar: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px',
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
};

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score, label: 'Good', color: '#eab308' };
  return { score, label: 'Strong', color: '#22c55e' };
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

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    import('@/lib/supabase-browser').then(({ createBrowserClient }) => {
      createBrowserClient().then(setSupabase);
    });
  }, []);

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Success — redirect to dashboard
      router.push('/dashboard');
      router.refresh();
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
          <div style={styles.logo}>XXIV</div>
          <h1 style={styles.heading}>Set new password</h1>
          <p style={styles.subheading}>
            Choose a strong password for your account
          </p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div style={styles.formGroup}>
              <label htmlFor="update-password" style={styles.label}>New password</label>
              <div style={styles.inputWrapper}>
                <input
                  id="update-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Min 8 characters"
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

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={styles.strengthBar}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: '3px',
                          borderRadius: '2px',
                          background: i <= Math.ceil((strength.score / 5) * 4)
                            ? strength.color
                            : 'rgba(255,255,255,0.1)',
                          transition: 'background 0.3s',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: strength.color, marginTop: '4px', display: 'block' }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="update-confirm" style={styles.label}>Confirm new password</label>
              <div style={styles.inputWrapper}>
                <input
                  id="update-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    ...styles.inputWithToggle,
                    borderColor: confirmPassword.length > 0 && confirmPassword !== password
                      ? 'rgba(239,68,68,0.5)'
                      : 'rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
                  onBlur={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.06)';
                    e.target.style.borderColor = confirmPassword !== password && confirmPassword.length > 0
                      ? 'rgba(239,68,68,0.5)'
                      : 'rgba(255,255,255,0.1)';
                  }}
                />
                <button
                  type="button"
                  style={styles.toggleBtn}
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            <button
              id="update-password-submit"
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
                  Updating…
                </span>
              ) : 'Update password'}
            </button>
          </form>

          <p style={styles.footer}>
            <Link href="/login" style={styles.footerLink}>← Back to sign in</Link>
          </p>
        </div>
      </main>
    </>
  );
}
