import Link from 'next/link';
import { notFound } from 'next/navigation';
import TemplateBuildButton from '@/components/xxiv/templates/TemplateBuildButton';
import { getTemplateBySlug } from '@/lib/services/templateService';

export const dynamic = 'force-dynamic';

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = await getTemplateBySlug(slug);

  if (!template) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), linear-gradient(180deg, #050505 0%, #000000 100%)',
        color: '#fff',
        padding: '40px 20px 80px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Link
          href="/templates"
          style={{
            display: 'inline-flex',
            color: '#9a9a9a',
            textDecoration: 'none',
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          Back to templates
        </Link>

        <div
          className="xxiv-template-detail-grid"
          style={{
            display: 'grid',
            gap: 28,
            gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.8fr)',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              borderRadius: 28,
              overflow: 'hidden',
              border: '1px solid #1d1d1d',
              background: '#0b0b0b',
              minHeight: 320,
            }}
          >
            {template.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.thumbnail_url}
                alt={template.name}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  minHeight: 420,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#555',
                  letterSpacing: '0.18em',
                }}
              >
                XXIV TEMPLATE
              </div>
            )}
          </div>

          <aside
            style={{
              borderRadius: 28,
              border: '1px solid #1d1d1d',
              background: 'linear-gradient(180deg, #0f0f0f 0%, #060606 100%)',
              padding: 28,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                borderRadius: 999,
                border: '1px solid #1d1d1d',
                color: '#bdbdbd',
                fontSize: 12,
                padding: '8px 12px',
                marginBottom: 16,
              }}
            >
              {template.category}
            </div>

            <h1 style={{ fontSize: 36, lineHeight: 1.05, margin: 0 }}>{template.name}</h1>
            <p style={{ color: '#a0a0a0', lineHeight: 1.7, fontSize: 15, marginTop: 14 }}>
              {template.description}
            </p>

            {template.tags?.length ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      borderRadius: 999,
                      background: '#111',
                      border: '1px solid #1d1d1d',
                      color: '#d5d5d5',
                      padding: '7px 10px',
                      fontSize: 12,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 12, marginTop: 26 }}>
              {template.preview_url ? (
                <a
                  href={template.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: 'none',
                    textAlign: 'center',
                    borderRadius: 14,
                    border: '1px solid #1d1d1d',
                    color: '#fff',
                    padding: '14px 16px',
                    fontSize: 14,
                  }}
                >
                  Open Live Preview
                </a>
              ) : null}

              {template.meta?.kind === 'imported_html_template' ? (
                <Link
                  href={`/templates/preview/${template.id}`}
                  style={{
                    textDecoration: 'none',
                    textAlign: 'center',
                    borderRadius: 14,
                    border: '1px solid #1d1d1d',
                    color: '#fff',
                    padding: '14px 16px',
                    fontSize: 14,
                  }}
                >
                  Open Layer Preview
                </Link>
              ) : (
                <TemplateBuildButton
                  href={`/templates/build/${template.id}`}
                  className="xxiv-template-detail-build-button"
                />
              )}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .xxiv-template-detail-build-button {
          width: 100%;
          border: none;
          border-radius: 14px;
          background: #ffffff;
          color: #000000;
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .xxiv-template-detail-build-button:disabled {
          opacity: 0.8;
          cursor: progress;
        }

        @media (max-width: 920px) {
          .xxiv-template-detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
