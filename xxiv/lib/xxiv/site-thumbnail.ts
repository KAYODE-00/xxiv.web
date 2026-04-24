import sharp from 'sharp';
import { uploadTemplateThumbnail } from '@/lib/thumbnail-upload';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSiteThumbnailSvg(name: string): string {
  const initial = escapeXml((name.trim()[0] || 'X').toUpperCase());
  const safeName = escapeXml(name.slice(0, 28));

  return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#09090b" />
          <stop offset="100%" stop-color="#27272a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" />
      <circle cx="1030" cy="120" r="170" fill="rgba(255,255,255,0.05)" />
      <rect x="52" y="52" width="1096" height="526" rx="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
      <rect x="88" y="92" width="180" height="180" rx="36" fill="rgba(255,255,255,0.09)" />
      <text x="178" y="210" text-anchor="middle" fill="#ffffff" font-size="110" font-family="Arial, sans-serif" font-weight="700">${initial}</text>
      <text x="88" y="336" fill="#f4f4f5" font-size="64" font-family="Arial, sans-serif" font-weight="700">${safeName}</text>
      <text x="88" y="382" fill="rgba(255,255,255,0.68)" font-size="26" font-family="Arial, sans-serif">XXIV Project</text>
      <rect x="88" y="430" width="320" height="18" rx="9" fill="rgba(255,255,255,0.24)" />
      <rect x="88" y="466" width="460" height="18" rx="9" fill="rgba(255,255,255,0.14)" />
      <rect x="88" y="502" width="390" height="18" rx="9" fill="rgba(255,255,255,0.14)" />
      <rect x="700" y="140" width="360" height="280" rx="28" fill="rgba(255,255,255,0.08)" />
      <rect x="736" y="182" width="210" height="18" rx="9" fill="rgba(255,255,255,0.24)" />
      <rect x="736" y="224" width="280" height="110" rx="18" fill="rgba(255,255,255,0.12)" />
      <rect x="736" y="360" width="140" height="28" rx="14" fill="#ffffff" />
    </svg>
  `;
}

export async function generateSiteThumbnail(siteId: string, name: string): Promise<string> {
  const svg = renderSiteThumbnailSvg(name);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return uploadTemplateThumbnail(`site-${siteId}`, buffer);
}
