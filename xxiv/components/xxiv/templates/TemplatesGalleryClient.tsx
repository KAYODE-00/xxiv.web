'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import TemplateBuildButton from './TemplateBuildButton';
import type { XxivTemplate } from '@/lib/services/templateService';

const CATEGORY_OPTIONS = [
  'All',
  'Business',
  'Portfolio',
  'Agency',
  'Restaurant',
  'Store',
  'SaaS',
  'Blog',
  'Personal',
  'Landing Page',
  'Creative',
  'Events',
  'Other',
];

export default function TemplatesGalleryClient({
  templates,
}: {
  templates: XxivTemplate[];
}) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesCategory =
        activeCategory === 'All' || template.category === activeCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        template.name,
        template.description,
        template.category,
        ...(template.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activeCategory, query, templates]);

  return (
    <div>
      <div
        className="xxiv-template-gallery-toolbar"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          marginBottom: 24,
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, tag, or category"
          style={{
            width: '100%',
            background: '#080808',
            border: '1px solid #1d1d1d',
            borderRadius: 14,
            color: '#fff',
            padding: '14px 16px',
            fontSize: 14,
            outline: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              style={{
                whiteSpace: 'nowrap',
                borderRadius: 999,
                border: activeCategory === category ? '1px solid #fff' : '1px solid #1d1d1d',
                background: activeCategory === category ? '#fff' : '#0b0b0b',
                color: activeCategory === category ? '#000' : '#cfcfcf',
                padding: '10px 14px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div
          style={{
            border: '1px solid #1d1d1d',
            borderRadius: 20,
            background: '#050505',
            padding: 32,
            color: '#8a8a8a',
            textAlign: 'center',
          }}
        >
          No templates matched your search.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {filteredTemplates.map((template) => (
            <article
              key={template.id}
              style={{
                background: 'linear-gradient(180deg, #101010 0%, #060606 100%)',
                border: '1px solid #1d1d1d',
                borderRadius: 24,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 100,
              }}
            >
              <Link
                href={`/templates/${template.slug}`}
                style={{
                  display: 'block',
                  aspectRatio: '16 / 10',
                  background: '#111',
                  overflow: 'hidden',
                }}
              >
                {template.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={template.thumbnail_url}
                    alt={template.name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#555',
                      fontSize: 18,
                      letterSpacing: '0.08em',
                    }}
                  >
                    XXIV
                  </div>
                )}
              </Link>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{template.name}</div>
                    <div style={{ color: '#8f8f8f', fontSize: 12, marginTop: 4 }}>{template.category}</div>
                  </div>
                  {template.is_featured ? (
                    <span
                      style={{
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#fff',
                        fontSize: 11,
                        padding: '6px 10px',
                      }}
                    >
                      Featured
                    </span>
                  ) : null}
                </div>

                <p style={{ color: '#a0a0a0', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  {template.description}
                </p>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {template.preview_url ? (
                    <a
                      href={template.preview_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        minWidth: 120,
                        textDecoration: 'none',
                        textAlign: 'center',
                        borderRadius: 12,
                        border: '1px solid #1d1d1d',
                        color: '#fff',
                        padding: '12px 14px',
                        fontSize: 13,
                      }}
                    >
                      Preview
                    </a>
                  ) : (
                    <Link
                      href={`/templates/${template.slug}`}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        textDecoration: 'none',
                        textAlign: 'center',
                        borderRadius: 12,
                        border: '1px solid #1d1d1d',
                        color: '#fff',
                        padding: '12px 14px',
                        fontSize: 13,
                      }}
                    >
                      Preview
                    </Link>
                  )}

                  <TemplateBuildButton
                    href={`/templates/build/${template.id}`}
                    className="xxiv-template-build-button"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <style>{`
        .xxiv-template-build-button {
          flex: 1;
          min-width: 160px;
          border: none;
          border-radius: 12px;
          background: #ffffff;
          color: #000000;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .xxiv-template-build-button:disabled {
          opacity: 0.8;
          cursor: progress;
        }

        @media (max-width: 900px) {
          .xxiv-template-gallery-toolbar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
