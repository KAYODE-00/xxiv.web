'use client';

import { useState } from 'react';

type ImportResult = {
  success: boolean;
  imported: number;
  templates: Array<{ id: string; name: string; type: string; category: string }>;
  errors: string[];
};

const SOURCES = ['flowbite', 'prebuiltui', 'internal', 'other'] as const;
const CATEGORIES = ['hero', 'navbar', 'features', 'testimonials', 'pricing', 'faq', 'footer', 'forms', 'cta', 'general'] as const;

export default function ImportTemplatePageClient() {
  const [source, setSource] = useState<(typeof SOURCES)[number]>('flowbite');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('general');
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/xxiv/templates/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          category,
          name,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to import template');
        return;
      }

      setResult(data as ImportResult);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to import template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Import Template</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Paste HTML, convert it into XXIV layer JSON, and publish the extracted layouts, blocks, and elements into the shared template library.
              </p>
            </div>
            <a
              href="/templates/manage"
              className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white"
            >
              Manage Imports
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-zinc-300">Source</span>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as (typeof SOURCES)[number])}
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
              >
                {SOURCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-zinc-300">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])}
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
              >
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-zinc-300">Template name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Template name"
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
              required
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-zinc-300">Tags</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="hero, saas, marketing"
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-zinc-300">Paste HTML here</span>
            <textarea
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              placeholder="<section>...</section>"
              className="min-h-[320px] rounded-xl border border-zinc-800 bg-black px-3 py-3 font-mono text-sm text-white"
              required
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-zinc-500">Only admins can publish imported templates.</div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Importing...' : 'Import Template'}
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {result ? (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-xl font-semibold">Results</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Imported {result.imported} blocks successfully.
            </p>

            {result.errors.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {result.errors.map((item) => (
                  <div key={item} className="rounded-lg border border-amber-900 bg-amber-950/50 px-3 py-2 text-sm text-amber-200">
                    {item}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 grid gap-2">
              {result.templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm">
                  <span>{template.name}</span>
                  <span className="text-zinc-500">
                    {template.type} · {template.category}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
