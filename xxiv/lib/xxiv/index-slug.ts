const XXIV_INDEX_SLUG_PREFIX = '__xxiv_index__';

export function buildXxivIndexSlug(siteId: string): string {
  return `${XXIV_INDEX_SLUG_PREFIX}${siteId}`;
}

export function isXxivIndexSlug(slug: string | null | undefined, siteId?: string | null): boolean {
  if (!slug || !siteId) return false;
  return slug === buildXxivIndexSlug(siteId);
}

export function stripXxivIndexSlug(slug: string, siteId?: string | null): string {
  return isXxivIndexSlug(slug, siteId) ? '' : slug;
}

