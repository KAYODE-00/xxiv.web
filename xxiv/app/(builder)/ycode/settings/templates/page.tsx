'use client';

import Link from 'next/link';

export default function TemplatesSettingsPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <header className="pt-8 pb-6">
          <span className="text-base font-medium">Templates</span>
        </header>

        <div className="bg-secondary/20 p-8 rounded-lg mb-8 text-center" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-lg font-medium mb-2">Template Gallery Moved</div>
          <div className="text-sm text-gray-400 mb-6 max-w-sm">
            You can now explore, preview, and build with templates directly from the main XXIV template gallery.
          </div>
          <Link
            href="/templates"
            className="xxiv-btn-primary"
            style={{
              display: 'inline-flex',
              padding: '10px 16px',
              fontSize: '14px',
              textDecoration: 'none',
              background: '#ffffff',
              color: '#000000',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Go to Templates Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}
