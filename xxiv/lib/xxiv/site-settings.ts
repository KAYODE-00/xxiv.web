import type { NextRequest } from 'next/server';

export const SITE_SCOPED_SETTING_KEYS = new Set([
  'draft_css',
  'published_css',
  'published_at',
  'sitemap',
  'robots_txt',
  'llms_txt',
  'ga_measurement_id',
  'google_site_verification',
  'global_canonical_url',
  'custom_code_head',
  'custom_code_body',
  'xxiv_badge',
  'timezone',
  'favicon_asset_id',
  'web_clip_asset_id',
  'redirects',
]);

const SITE_SETTING_PREFIX = 'xxiv_site_setting';

export function isSiteScopedSettingKey(key: string): boolean {
  return SITE_SCOPED_SETTING_KEYS.has(key);
}

export function buildSiteScopedSettingKey(siteId: string, key: string): string {
  return `${SITE_SETTING_PREFIX}:${siteId}:${key}`;
}

export function parseSiteScopedSettingKey(storageKey: string): {
  siteId: string;
  key: string;
} | null {
  if (!storageKey.startsWith(`${SITE_SETTING_PREFIX}:`)) {
    return null;
  }

  const [, siteId, ...rest] = storageKey.split(':');
  if (!siteId || rest.length === 0) {
    return null;
  }

  return {
    siteId,
    key: rest.join(':'),
  };
}

export function resolveSiteScopedStorageKey(
  key: string,
  siteId?: string | null,
): string {
  if (!siteId || !isSiteScopedSettingKey(key)) {
    return key;
  }

  return buildSiteScopedSettingKey(siteId, key);
}

export function getXxivSiteIdFromRequest(request: NextRequest): string | null {
  const fromHeader = request.headers.get('x-site-id');
  if (fromHeader) {
    return fromHeader;
  }

  const fromQuery = request.nextUrl.searchParams.get('xxiv_site_id');
  if (fromQuery) {
    return fromQuery;
  }

  return request.cookies.get('xxiv_site_id')?.value || null;
}
