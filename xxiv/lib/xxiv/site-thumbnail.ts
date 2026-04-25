import { getSupabaseAdmin } from '@/lib/supabase-server';
import { STORAGE_BUCKET, STORAGE_FOLDERS } from '@/lib/asset-constants';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getColorFromName(name: string): string {
  const colors = [
    '#0f172a',
    '#1e1b4b',
    '#0c0a09',
    '#042f2e',
    '#1c1917',
    '#0a0a0a',
    '#111827',
    '#1a0533',
    '#0d1117',
    '#191919',
  ];

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function getAccentFromName(name: string): string {
  const accents = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#f97316',
    '#a855f7',
    '#06b6d4',
  ];

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash) + index;
  }

  return accents[Math.abs(hash) % accents.length];
}

function getDisplayName(siteName: string): string {
  const normalized = siteName.trim() || 'Untitled Site';
  return normalized.length > 20 ? `${normalized.slice(0, 20)}...` : normalized;
}

export function generateSiteThumbnailSVG(siteName: string, options?: { isLive?: boolean }): string {
  const displayName = escapeXml(getDisplayName(siteName));
  const bg = getColorFromName(siteName);
  const accent = getAccentFromName(siteName);
  const liveLabel = options?.isLive ? 'LIVE' : 'DRAFT';
  const liveFill = options?.isLive ? '#10b981' : `${accent}cc`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${bg}dd" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#grad)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect x="0" y="0" width="1200" height="52" fill="rgba(255,255,255,0.04)"/>
  <rect x="32" y="18" width="80" height="16" rx="4" fill="rgba(255,255,255,0.15)"/>
  <rect x="900" y="18" width="48" height="16" rx="4" fill="rgba(255,255,255,0.08)"/>
  <rect x="960" y="18" width="48" height="16" rx="4" fill="rgba(255,255,255,0.08)"/>
  <rect x="1020" y="18" width="48" height="16" rx="4" fill="rgba(255,255,255,0.08)"/>
  <rect x="1080" y="12" width="88" height="28" rx="14" fill="${liveFill}"/>
  <text x="1124" y="30" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="2">${liveLabel}</text>

  <rect x="0" y="52" width="1200" height="2" fill="${accent}44"/>
  <rect x="180" y="130" width="420" height="24" rx="6" fill="rgba(255,255,255,0.18)"/>
  <rect x="180" y="166" width="620" height="16" rx="4" fill="rgba(255,255,255,0.08)"/>
  <rect x="180" y="192" width="520" height="16" rx="4" fill="rgba(255,255,255,0.08)"/>
  <rect x="180" y="228" width="132" height="36" rx="8" fill="${accent}"/>
  <rect x="326" y="228" width="132" height="36" rx="8" fill="rgba(255,255,255,0.08)"/>

  <text x="600" y="380" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff" text-anchor="middle" opacity="0.92">${displayName}</text>
  <circle cx="600" cy="430" r="4" fill="${accent}"/>

  <rect x="80" y="490" width="280" height="100" rx="10" fill="rgba(255,255,255,0.05)"/>
  <rect x="100" y="510" width="120" height="12" rx="3" fill="rgba(255,255,255,0.1)"/>
  <rect x="100" y="532" width="200" height="8" rx="3" fill="rgba(255,255,255,0.06)"/>
  <rect x="100" y="548" width="160" height="8" rx="3" fill="rgba(255,255,255,0.06)"/>

  <rect x="400" y="490" width="280" height="100" rx="10" fill="rgba(255,255,255,0.05)"/>
  <rect x="420" y="510" width="120" height="12" rx="3" fill="rgba(255,255,255,0.1)"/>
  <rect x="420" y="532" width="200" height="8" rx="3" fill="rgba(255,255,255,0.06)"/>
  <rect x="420" y="548" width="160" height="8" rx="3" fill="rgba(255,255,255,0.06)"/>

  <rect x="720" y="490" width="280" height="100" rx="10" fill="rgba(255,255,255,0.05)"/>
  <rect x="740" y="510" width="120" height="12" rx="3" fill="rgba(255,255,255,0.1)"/>
  <rect x="740" y="532" width="200" height="8" rx="3" fill="rgba(255,255,255,0.06)"/>
  <rect x="740" y="548" width="160" height="8" rx="3" fill="rgba(255,255,255,0.06)"/>

  <text x="600" y="615" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.2)" text-anchor="middle" letter-spacing="4">XXIV</text>
</svg>`;
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function generateAndStoreThumbnail(
  siteName: string,
  siteId: string,
  options?: { isLive?: boolean },
): Promise<string | null> {
  const svg = generateSiteThumbnailSVG(siteName, options);
  const admin = await getSupabaseAdmin();

  if (!admin) {
    return svgToDataUrl(svg);
  }

  const filePath = `${STORAGE_FOLDERS.SITES}/site-${siteId}.svg`;
  const svgBuffer = Buffer.from(svg, 'utf-8');

  try {
    const { data, error } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, svgBuffer, {
        contentType: 'image/svg+xml',
        cacheControl: '3600',
        upsert: true,
      });

    if (error || !data?.path) {
      console.error('[site-thumbnail] Upload failed:', error);
      return svgToDataUrl(svg);
    }

    const { data: urlData } = admin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl || svgToDataUrl(svg);
  } catch (error) {
    console.error('[site-thumbnail] Generation failed:', error);
    return svgToDataUrl(svg);
  }
}
