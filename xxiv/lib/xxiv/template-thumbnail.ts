import sharp from 'sharp';
import { uploadTemplateThumbnail } from '@/lib/thumbnail-upload';
import type { Layer } from '@/types';
import type { ImportedTemplateMeta } from '@/lib/repositories/templateRepository';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function gatherPreviewItems(layers: Layer[], maxItems = 7): Array<{ kind: string; depth: number }> {
  const items: Array<{ kind: string; depth: number }> = [];

  function visit(layer: Layer, depth: number) {
    if (items.length >= maxItems) return;

    const tag = (layer.settings?.tag || layer.name).toLowerCase();
    let kind = 'container';
    if (layer.name === 'image') kind = 'image';
    else if (layer.name === 'button' || layer.name === 'link') kind = 'button';
    else if (layer.name === 'text' || /^h[1-6]$/.test(tag) || ['p', 'span', 'label'].includes(tag)) kind = 'text';
    else if (layer.name === 'input' || layer.name === 'form') kind = 'field';

    items.push({ kind, depth });
    layer.children?.forEach((child) => visit(child, depth + 1));
  }

  layers.forEach((layer) => visit(layer, 0));
  return items;
}

function paletteForMeta(meta: ImportedTemplateMeta) {
  switch (meta.category) {
    case 'hero':
      return { bg0: '#0f172a', bg1: '#1d4ed8', accent: '#f8fafc', soft: '#93c5fd' };
    case 'navbar':
      return { bg0: '#111827', bg1: '#374151', accent: '#ffffff', soft: '#cbd5e1' };
    case 'pricing':
      return { bg0: '#1f2937', bg1: '#7c3aed', accent: '#ffffff', soft: '#ddd6fe' };
    case 'features':
      return { bg0: '#052e16', bg1: '#16a34a', accent: '#f0fdf4', soft: '#86efac' };
    default:
      return { bg0: '#111111', bg1: '#404040', accent: '#ffffff', soft: '#d4d4d4' };
  }
}

function renderPreviewSvg(name: string, meta: ImportedTemplateMeta, layers: Layer[]): string {
  const palette = paletteForMeta(meta);
  const items = gatherPreviewItems(layers);
  const blocks = items
    .map((item, index) => {
      const baseY = 116 + index * 34;
      const x = 40 + item.depth * 18;
      const width = item.kind === 'image' ? 260 : item.kind === 'button' ? 120 : item.kind === 'field' ? 220 : 190;
      const height = item.kind === 'image' ? 52 : item.kind === 'button' ? 18 : item.kind === 'field' ? 20 : 10;
      const radius = item.kind === 'image' ? 14 : item.kind === 'button' || item.kind === 'field' ? 10 : 5;
      const fill = item.kind === 'image' ? 'rgba(255,255,255,0.18)' : item.kind === 'button' ? palette.soft : 'rgba(255,255,255,0.28)';
      return `<rect x="${x}" y="${baseY}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" />`;
    })
    .join('');

  return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.bg0}" />
          <stop offset="100%" stop-color="${palette.bg1}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" rx="36" fill="url(#bg)" />
      <circle cx="1020" cy="140" r="180" fill="rgba(255,255,255,0.06)" />
      <circle cx="1060" cy="500" r="120" fill="rgba(255,255,255,0.05)" />
      <rect x="36" y="36" width="1128" height="558" rx="28" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.12)" />
      <text x="56" y="84" fill="${palette.soft}" font-size="28" font-family="Arial, sans-serif" letter-spacing="2">${escapeXml(meta.source.toUpperCase())} · ${escapeXml(meta.type.toUpperCase())}</text>
      <text x="56" y="150" fill="${palette.accent}" font-size="58" font-family="Arial, sans-serif" font-weight="700">${escapeXml(name.slice(0, 34))}</text>
      <text x="56" y="192" fill="rgba(255,255,255,0.72)" font-size="28" font-family="Arial, sans-serif">${escapeXml(meta.category)}</text>
      <rect x="56" y="228" width="520" height="288" rx="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" />
      <rect x="640" y="86" width="472" height="460" rx="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" />
      <rect x="676" y="128" width="140" height="18" rx="9" fill="rgba(255,255,255,0.3)" />
      <rect x="676" y="164" width="320" height="32" rx="12" fill="${palette.soft}" />
      ${blocks}
      <text x="56" y="552" fill="rgba(255,255,255,0.65)" font-size="22" font-family="Arial, sans-serif">Imported into XXIV Template Library</text>
    </svg>
  `;
}

export async function generateImportedTemplateThumbnail(input: {
  id: string;
  name: string;
  meta: ImportedTemplateMeta;
  layers: Layer[];
}): Promise<string> {
  const svg = renderPreviewSvg(input.name, input.meta, input.layers);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return uploadTemplateThumbnail(input.id, buffer);
}
