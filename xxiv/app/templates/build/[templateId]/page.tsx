'use client';

import { useState, useTransition, use, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Layout, Sparkles } from 'lucide-react';
import { buildWithTemplate } from '../../actions';

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default function BuildTemplatePage({ params }: PageProps) {
  const { templateId } = use(params);
  const router = useRouter();
  const [siteName, setSiteName] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim() || isPending) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await buildWithTemplate(templateId, siteName.trim());
        if (result.redirectUrl) {
          router.push(result.redirectUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create site');
      }
    });
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 480 }}>
        <Link
          href="/templates"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: '#888',
            textDecoration: 'none',
            fontSize: 14,
            marginBottom: 40,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
        >
          <ArrowLeft size={16} />
          Back to templates
        </Link>

        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 12,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.05)',
              marginBottom: 20,
              color: '#fff',
            }}
          >
            <Layout size={24} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 10px' }}>Name your project</h1>
          <p style={{ color: '#888', fontSize: 16, margin: 0 }}>
            Almost ready. Give your new XXIV site a name to get started.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: 'linear-gradient(180deg, #0a0a0a 0%, #000 100%)',
            border: '1px solid #1a1a1a',
            borderRadius: 24,
            padding: 32,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="siteName"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10,
              }}
            >
              Project Name
            </label>
            <input
              ref={inputRef}
              id="siteName"
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. My Portfolio"
              disabled={isPending}
              style={{
                width: '100%',
                background: '#050505',
                border: '1px solid #1a1a1a',
                borderRadius: 12,
                padding: '16px',
                color: '#fff',
                fontSize: 16,
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.02)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#1a1a1a';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 24,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!siteName.trim() || isPending}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 12,
              background: siteName.trim() && !isPending ? '#fff' : '#1a1a1a',
              color: siteName.trim() && !isPending ? '#000' : '#444',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: siteName.trim() && !isPending ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 0.1s, opacity 0.2s',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPending ? (
              'Creating Project...'
            ) : (
              <>
                Create Project
                <Sparkles size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ color: '#444', fontSize: 13, margin: 0 }}>
            You can change the name and URL later in site settings.
          </p>
        </div>
      </div>
    </main>
  );
}
