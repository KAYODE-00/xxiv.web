'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { ImportedTemplateRecord } from '@/lib/services/templateService';

export default function ManageImportedTemplatesClient({
  initialTemplates,
}: {
  initialTemplates: ImportedTemplateRecord[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function removeTemplate(id: string) {
    setTemplates((current) => current.filter((template) => template.id !== id));
  }

  function updateThumbnail(id: string, thumbnailUrl: string) {
    setTemplates((current) =>
      current.map((template) => template.id === id ? { ...template, thumbnail_url: thumbnailUrl } : template),
    );
  }

  function handleDelete(id: string) {
    setError(null);
    setMessage(null);
    setPendingId(id);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/xxiv/templates/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete template');
        }
        removeTemplate(id);
        setMessage('Template deleted.');
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete template');
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleRegenerate(id: string) {
    setError(null);
    setMessage(null);
    setPendingId(id);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/xxiv/templates/${id}/thumbnail`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to regenerate thumbnail');
        }
        if (data?.data?.thumbnail_url) {
          updateThumbnail(id, data.data.thumbnail_url);
        }
        setMessage('Thumbnail regenerated.');
      } catch (regenError) {
        setError(regenError instanceof Error ? regenError.message : 'Failed to regenerate thumbnail');
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Manage Imported Templates</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Review imported templates, regenerate their thumbnails, and remove anything you no longer want in the library.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/templates/import" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white">
              Import More
            </Link>
            <Link href="/dashboard" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white">
              Back to Dashboard
            </Link>
          </div>
        </div>

        {message ? <div className="mb-4 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-400">
            No imported templates yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => {
              const busy = pendingId === template.id && isPending;

              return (
                <article key={template.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                  <div className="aspect-[16/10] bg-zinc-900">
                    {template.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={template.thumbnail_url} alt={template.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm tracking-[0.2em] text-zinc-500">
                        XXIV TEMPLATE
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">{template.name}</h2>
                        <p className="mt-1 text-sm text-zinc-400">
                          {template.category} · {template.meta.type} · {template.meta.source}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-500">{template.description}</p>

                    <div className="flex flex-wrap gap-2">
                      {(template.tags || []).slice(0, 5).map((tag) => (
                        <span key={tag} className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/templates/${template.slug}`}
                        className="flex-1 rounded-lg border border-zinc-800 px-3 py-2 text-center text-sm text-zinc-300 hover:border-zinc-700 hover:text-white"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/templates/preview/${template.id}`}
                        className="flex-1 rounded-lg border border-zinc-800 px-3 py-2 text-center text-sm text-zinc-300 hover:border-zinc-700 hover:text-white"
                      >
                        Preview
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegenerate(template.id)}
                        disabled={busy}
                        className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-70"
                      >
                        {busy ? 'Working...' : 'Regenerate Thumbnail'}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        disabled={busy}
                        className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 disabled:opacity-70"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
