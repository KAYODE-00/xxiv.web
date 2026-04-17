import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTemplateById, getTemplatePages, getTemplateLayers } from '@/lib/repositories/templateRepository';
import PageRenderer from '@/components/PageRenderer';
import type { Page } from '@/types';
import TemplateBuildButton from '@/components/xxiv/templates/TemplateBuildButton';

export const dynamic = 'force-dynamic';

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  const template = await getTemplateById(templateId);
  if (!template) {
    notFound();
  }

  const pages = await getTemplatePages(templateId);
  if (!pages || pages.length === 0) {
    notFound();
  }

  // Find the index page or fallback to the first page
  const homePage = pages.find((p) => p.is_index) || pages[0];
  const templateLayers = await getTemplateLayers([homePage.id]);
  const specificLayer = templateLayers.find(l => l.template_page_id === homePage.id);

  if (!specificLayer) {
    notFound();
  }

  // Construct a minimal Page instance needed by PageRenderer
  const mockPage: Page = {
    id: homePage.id,
    name: homePage.name,
    slug: homePage.slug,
    is_index: homePage.is_index,
    order: homePage.page_order,
    depth: 0,
    is_dynamic: false,
    page_folder_id: null,
    error_page: null,
    settings: homePage.settings,
    is_published: true,
    created_at: homePage.created_at,
    updated_at: homePage.updated_at,
    deleted_at: null,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#000' }}>
      {/* Preview Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid #1a1a1a',
          background: '#0a0a0a',
          color: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link 
            href={`/templates/${template.slug}`}
            style={{
              color: '#888',
              textDecoration: 'none',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            ← Back
          </Link>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {template.name} <span style={{ color: '#666', fontWeight: 400, marginLeft: 4 }}>Preview</span>
          </div>
        </div>
        
        <div>
          <TemplateBuildButton 
            href={`/templates/build/${template.id}`}
            className="xxiv-template-preview-build-button"
          />
        </div>
      </div>

      {/* Render Template Canvas */}
      <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
        <PageRenderer 
          page={mockPage}
          layers={specificLayer.layers}
          components={[]}
          generatedCss={specificLayer.generated_css || undefined}
        />
      </div>

      <style>{`
        .xxiv-template-preview-build-button {
          border: none;
          border-radius: 8px;
          background: #ffffff;
          color: #000000;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .xxiv-template-preview-build-button:disabled {
          opacity: 0.8;
          cursor: progress;
        }
      `}</style>
    </div>
  );
}
