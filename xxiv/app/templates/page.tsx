import TemplatesGalleryClient from '@/components/xxiv/templates/TemplatesGalleryClient';
import { getTemplates } from '@/lib/services/templateService';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const templates = await getTemplates({ publishedOnly: false });
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error ? decodeURIComponent(resolvedSearchParams.error) : null;

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 30%), linear-gradient(180deg, #050505 0%, #000000 100%)',
        color: '#fff',
        padding: '48px 20px 80px',
      }}
    >
      <div style={{ maxWidth: 1220, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 14,
              letterSpacing: '0.24em',
              color: '#7c7c7c',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            XXIV
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1, margin: 0 }}>
            Templates
          </h1>
          <p style={{ maxWidth: 640, color: '#9a9a9a', fontSize: 16, lineHeight: 1.7, marginTop: 14 }}>
            Start with a professionally designed website, launch into the editor instantly, and publish with the same XXIV workflow you already use.
          </p>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 20,
              borderRadius: 16,
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)',
              color: '#fca5a5',
              padding: '14px 16px',
            }}
          >
            {error}
          </div>
        ) : null}

        <TemplatesGalleryClient templates={templates} />
      </div>
    </main>
  );
}
