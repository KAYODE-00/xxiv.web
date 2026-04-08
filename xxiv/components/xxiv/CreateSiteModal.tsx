'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, PlusSquare, Sparkles, X, ArrowLeft } from 'lucide-react';
import { createSite } from '@/app/(dashboard)/actions/sites';

type Step = 'method' | 'name';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
}

export default function CreateSiteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('method');
  const [siteName, setSiteName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const slugPreview = useMemo(() => slugify(siteName) || 'your-site', [siteName]);

  function closeAndReset() {
    setStep('method');
    setSiteName('');
    setError(null);
    onClose();
  }

  function goToNameStep() {
    setError(null);
    setStep('name');
  }

  async function submit() {
    setError(null);
    const formData = new FormData();
    formData.set('name', siteName);

    startTransition(async () => {
      try {
        await createSite(formData);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to create site';
        setError(msg);
      }
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: 16,
      }}
      onClick={closeAndReset}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: 16,
          padding: 32,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAndReset}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid #1a1a1a',
            background: 'transparent',
            color: '#bbb',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {step === 'method' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>
              How do you want to start?
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <button
                onClick={() => router.push('/templates')}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: '1px solid #1a1a1a',
                  borderRadius: 14,
                  padding: 16,
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <LayoutGrid size={20} />
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Start with a Template</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 6, lineHeight: 1.4 }}>
                  Professional designs ready to customize
                </div>
              </button>

              <button
                onClick={goToNameStep}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: '1px solid #1a1a1a',
                  borderRadius: 14,
                  padding: 16,
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <PlusSquare size={20} />
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Start from Scratch</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 6, lineHeight: 1.4 }}>
                  Blank canvas, your vision
                </div>
              </button>

              <button
                disabled
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: '1px solid #1a1a1a',
                  borderRadius: 14,
                  padding: 16,
                  cursor: 'not-allowed',
                  color: '#fff',
                  opacity: 0.5,
                  position: 'relative',
                }}
              >
                <Sparkles size={20} />
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Generate with AI</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 6, lineHeight: 1.4 }}>
                  Describe it, AI builds it
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    fontSize: 11,
                    color: '#d4d4d4',
                    border: '1px solid #2a2a2a',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 999,
                    padding: '4px 8px',
                  }}
                >
                  Coming Soon
                </div>
              </button>
            </div>
          </>
        )}

        {step === 'name' && (
          <>
            <button
              onClick={() => {
                setError(null);
                setStep('method');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: 'none',
                color: '#bbb',
                cursor: 'pointer',
                padding: 0,
                marginBottom: 14,
              }}
            >
              <ArrowLeft size={18} />
              Back
            </button>

            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Name your site</div>

            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. My Portfolio"
              autoFocus
              style={{
                width: '100%',
                background: '#0f0f0f',
                border: '1px solid #1a1a1a',
                borderRadius: 12,
                padding: '14px 14px',
                color: '#fff',
                fontSize: 16,
                outline: 'none',
              }}
            />

            <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
              xxivbuilder.com/{slugPreview}
            </div>

            {error && (
              <div
                style={{
                  marginTop: 14,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#fca5a5',
                  borderRadius: 12,
                  padding: '10px 12px',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                className="xxiv-btn-primary"
                onClick={submit}
                disabled={pending || !siteName.trim()}
                style={{
                  padding: '10px 14px',
                  fontSize: 14,
                  opacity: pending || !siteName.trim() ? 0.7 : 1,
                  cursor: pending || !siteName.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {pending ? 'Creating…' : 'Create Site →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

