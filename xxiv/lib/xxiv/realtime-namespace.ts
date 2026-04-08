import type { Page } from '@/types';

/** Read `xxiv_site_id` cookie (client-only). */
export function readXxivSiteCookieFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)xxiv_site_id=([^;]*)/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
}

/** Site id from query string or cookie (browser). */
export function getXxivSiteIdFromBrowser(): string | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search).get('xxiv_site_id');
  if (q) return q;
  return readXxivSiteCookieFromDocument();
}

/**
 * Segment appended to Supabase Realtime channel names.
 * - XXIV site: all members (e.g. invitees) share `site:<uuid>`.
 * - No site: isolate by Supabase auth user so unrelated accounts never join the same room.
 */
export function collaborationNamespaceSegment(
  xxivSiteId: string | null | undefined,
  authUserId: string | null | undefined,
): string {
  if (xxivSiteId) return `site:${xxivSiteId}`;
  if (authUserId) return `user:${authUserId}`;
  return 'anon';
}

export function scopedCollaborationChannel(
  baseName: string,
  xxivSiteId: string | null | undefined,
  authUserId: string | null | undefined,
): string {
  return `${baseName}:${collaborationNamespaceSegment(xxivSiteId, authUserId)}`;
}

/** Server / MCP: derive the same segment from page settings (untagged = legacy global bucket). */
export function collaborationNamespaceSegmentFromPage(page: Page | null | undefined): string {
  const xxiv = (page?.settings as { xxiv?: { site_id?: string } } | undefined)?.xxiv;
  const siteId = xxiv?.site_id;
  if (typeof siteId === 'string' && siteId.length > 0) return `site:${siteId}`;
  return 'legacy-shared';
}

export function pagesUpdatesChannelForPage(page: Page | null | undefined): string {
  return `pages:updates:${collaborationNamespaceSegmentFromPage(page)}`;
}

export function componentsUpdatesChannelForSegment(segment: string): string {
  return `components:updates:${segment}`;
}
