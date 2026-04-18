'use client';

import { useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase-browser';
import CreateSiteModal from '@/components/xxiv/CreateSiteModal';
import AiBuilderButton from '@/components/ai-builder/AiBuilderButton';
import { deleteSite, openSiteEditor } from '../actions/sites';

type SiteRow = {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  plan: string;
  is_published: boolean | null;
  live_url?: string | null;
  cf_project_name?: string | null;
  custom_domain?: string | null;
  custom_domain_verified?: boolean | null;
  publish_status?: 'unpublished' | 'deploying' | 'live' | 'failed' | string | null;
  last_published_at?: string | null;
  thumbnail_url: string | null;
  page_folder_id: string | null;
  home_page_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatCreatedDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DashboardClient({
  user,
  initialSites,
}: {
  user: { id: string; email?: string | null };
  initialSites: { owned: SiteRow[]; collaborative: SiteRow[] };
}) {
  const [ownedSites, setOwnedSites] = useState<SiteRow[]>(initialSites?.owned || []);
  const [collabSites, setCollabSites] = useState<SiteRow[]>(initialSites?.collaborative || []);
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<SiteRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = ownedSites.length + collabSites.length;
    const published = [...ownedSites, ...collabSites].filter((s) => !!s.live_url || s.publish_status === 'live').length;
    const drafts = total - published;
    return { total, published, drafts };
  }, [ownedSites, collabSites]);

  async function handleSignOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function handleDelete(site: SiteRow) {
    setError(null);
    setConfirmDeleteFor(null);
    setMenuOpenFor(null);

    const prev = ownedSites;
    setOwnedSites((cur) => cur.filter((s) => s.id !== site.id));

    startTransition(async () => {
      try {
        await deleteSite(site.id);
      } catch (e) {
        setOwnedSites(prev);
        setError(e instanceof Error ? e.message : 'Failed to delete site');
      }
    });
  }

  async function handleOpenEditor(siteId: string) {
    setMenuOpenFor(null);
    startTransition(async () => {
      await openSiteEditor(siteId);
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
      {/* Navbar */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid #1a1a1a',
          background: '#000',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--xxiv-font-bebas), "Bebas Neue", sans-serif',
            fontSize: 24,
            letterSpacing: '0.15em',
          }}
        >
          XXIV
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="/templates"
            style={{
              color: '#bbb',
              textDecoration: 'none',
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #1a1a1a',
              transition: 'color 0.15s',
            }}
          >
            Templates
          </a>
          <div style={{ color: '#888', fontSize: 13 }}>{user.email || ''}</div>
          <button
            onClick={handleSignOut}
            style={{
              background: 'transparent',
              color: '#bbb',
              border: '1px solid #1a1a1a',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ padding: 40 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 500 }}>My Sites</div>
          <button
            className="xxiv-btn-primary"
            onClick={() => setCreateOpen(true)}
            style={{ padding: '10px 14px', fontSize: 14 }}
          >
            + New Site
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 18,
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.08)',
              color: '#fca5a5',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Stats row */}
        {sites.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 22 }}>
            {[
              { label: 'Total Sites', value: stats.total },
              { label: 'Published', value: stats.published },
              { label: 'Drafts', value: stats.drafts },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{c.value}</div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 6 }}>{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Owned Sites Empty State */}
        {ownedSites.length === 0 && (
          <div
            style={{
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 18, color: '#fff', marginBottom: 8 }}>No personal sites yet</div>
              <button className="xxiv-btn-primary" onClick={() => setCreateOpen(true)} style={{ padding: '10px 14px', fontSize: 13 }}>
                + Create Site
              </button>
            </div>
          </div>
        )}

        {/* Owned Sites Grid */}
        {ownedSites.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 40 }}>
            {ownedSites.map((site) => (
              <SiteCard 
                key={site.id} 
                site={site} 
                isOwner={true}
                onOpen={handleOpenEditor}
                onDelete={setConfirmDeleteFor}
                menuOpenFor={menuOpenFor}
                setMenuOpenFor={setMenuOpenFor}
              />
            ))}
          </div>
        )}

        {/* Collaboration Section */}
        {(collabSites.length > 0 || ownedSites.length > 0) && (
          <div style={{ marginTop: 20 }}>
             <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 18, borderTop: '1px solid #1a1a1a', paddingTop: 40 }}>
                Collaboration
             </div>
             
             {collabSites.length === 0 ? (
               <div style={{ padding: '20px 0', color: '#666', fontSize: 14 }}>
                 Sites shared with you will appear here.
               </div>
             ) : (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                 {collabSites.map((site) => (
                   <SiteCard 
                     key={site.id} 
                     site={site} 
                     isOwner={false}
                     onOpen={handleOpenEditor}
                     menuOpenFor={menuOpenFor}
                     setMenuOpenFor={setMenuOpenFor}
                   />
                 ))}
               </div>
             )}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDeleteFor && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 16,
          }}
          onClick={() => setConfirmDeleteFor(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: 16,
              padding: 22,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Delete site?</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              This will permanently remove <span style={{ color: '#fff' }}>{confirmDeleteFor.name}</span> and its Xxiv pages.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDeleteFor(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #1a1a1a',
                  color: '#bbb',
                  borderRadius: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteFor)}
                disabled={pending}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '10px 12px',
                  cursor: pending ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: pending ? 0.75 : 1,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateSiteModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function SiteCard({ 
  site, 
  isOwner, 
  onOpen, 
  onDelete, 
  menuOpenFor, 
  setMenuOpenFor 
}: { 
  site: any; 
  isOwner: boolean;
  onOpen: (id: string) => void;
  onDelete?: (site: any) => void;
  menuOpenFor: string | null;
  setMenuOpenFor: (id: string | null) => void;
}) {
  const isLive = !!site.live_url || site.publish_status === 'live';
  const liveUrl = site.custom_domain && site.custom_domain_verified
    ? `https://${site.custom_domain}`
    : site.live_url || (site.cf_project_name ? `https://${site.cf_project_name}.pages.dev` : null);
  const statusLabel = isLive
    ? 'Live'
    : site.publish_status === 'deploying'
      ? 'Deploying...'
      : site.publish_status === 'failed'
        ? 'Failed'
        : 'Not published';
  const statusColor = isLive ? '#22c55e' : site.publish_status === 'failed' ? '#ef4444' : site.publish_status === 'deploying' ? '#f59e0b' : '#666';

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: 12,
        overflow: 'visible',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        style={{
          height: 180,
          background: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px 12px 0 0',
        }}
      >
        {!site.thumbnail_url ? (
          <div style={{ fontSize: 56, fontWeight: 700, color: '#444' }}>
            {site.name?.trim()?.[0]?.toUpperCase() || 'X'}
          </div>
        ) : (
          <img
            src={site.thumbnail_url}
            alt={site.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {site.name}
            </div>
            {site.owner?.email && (
              <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                by {site.owner.email}
              </div>
            )}
            <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
              {formatCreatedDate(site.created_at)}
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: isLive ? '#86efac' : statusColor === '#ef4444' ? '#fca5a5' : '#a3a3a3',
              fontSize: 12,
              padding: '6px 10px',
              border: '1px solid #1a1a1a',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.02)',
              flexShrink: 0,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: statusColor, display: 'inline-block' }} />
            {statusLabel}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={() => onOpen(site.id)}
            style={{
              flex: 1,
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>

          <AiBuilderButton
            projectId={site.id}
            className="h-[42px] flex-1 rounded-[10px] border border-[#1a1a1a] bg-transparent px-3 text-[13px] font-medium text-white hover:bg-white/5"
          />

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpenFor(menuOpenFor === site.id ? null : site.id)}
              style={{
                width: 44,
                background: 'transparent',
                color: '#bbb',
                border: '1px solid #1a1a1a',
                borderRadius: 10,
                padding: '10px 0',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ⋯
            </button>

            {menuOpenFor === site.id && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 48,
                  width: 200,
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderRadius: 12,
                  overflow: 'hidden',
                  zIndex: 1000,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                }}
              >
                <button
                  onClick={() => onOpen(site.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                >
                  Open Editor
                </button>
                {isOwner && (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpenFor(null);
                        window.location.href = `/sites/${site.id}/settings`;
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                    >
                      Site Settings
                    </button>
                    <div style={{ height: 1, background: '#1a1a1a' }} />
                    <button
                      onClick={() => onDelete?.(site)}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 13 }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
