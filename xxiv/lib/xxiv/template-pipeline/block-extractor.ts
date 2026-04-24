import { cloneDeep } from '@/lib/utils';
import type { Layer } from '@/types';

export type BlockType = 'layout' | 'block' | 'element';

export interface ExtractedBlock {
  name: string;
  type: BlockType;
  category: string;
  layer: Layer;
}

function getLayerClasses(layer: Layer): string {
  return Array.isArray(layer.classes) ? layer.classes.join(' ') : layer.classes || '';
}

function getLayerText(layer: Layer): string {
  const textVariable = layer.variables?.text;
  if (!textVariable) return '';

  if (textVariable.type === 'dynamic_text' || textVariable.type === 'static_text') {
    return textVariable.data.content;
  }

  return JSON.stringify(textVariable.data.content);
}

export function detectBlockType(layer: Layer, depth = 0): BlockType {
  const tag = (layer.settings?.tag || layer.name || '').toLowerCase();
  const classes = getLayerClasses(layer);
  const childCount = layer.children?.length || 0;

  if (depth === 0) {
    return 'layout';
  }

  if (['section', 'nav', 'header', 'footer', 'main', 'article', 'aside', 'form'].includes(tag)) {
    return 'block';
  }

  if (['button', 'input', 'image', 'link', 'icon', 'video', 'audio'].includes(layer.name)) {
    return 'element';
  }

  if (childCount <= 1 && depth >= 2) {
    return 'element';
  }

  if (/(^|\s)(py-|px-|p-)/.test(classes) && childCount >= 2) {
    return 'block';
  }

  return 'block';
}

export function detectCategory(layer: Layer): string {
  const combined = `${getLayerClasses(layer)} ${layer.settings?.tag || layer.name} ${getLayerText(layer)}`.toLowerCase();

  if (combined.includes('nav') || combined.includes('menu') || combined.includes('header')) return 'navbar';
  if (combined.includes('hero') || combined.includes('headline') || combined.includes('build faster')) return 'hero';
  if (combined.includes('feature') || combined.includes('grid') || combined.includes('card')) return 'features';
  if (combined.includes('testimonial') || combined.includes('review') || combined.includes('quote')) return 'testimonials';
  if (combined.includes('price') || combined.includes('plan') || combined.includes('billing')) return 'pricing';
  if (combined.includes('faq') || combined.includes('question')) return 'faq';
  if (combined.includes('footer') || combined.includes('copyright')) return 'footer';
  if (combined.includes('contact') || combined.includes('form') || combined.includes('input')) return 'forms';
  if (combined.includes('cta') || combined.includes('get started') || combined.includes('call to action')) return 'cta';
  if (combined.includes('team') || combined.includes('about')) return 'about';
  if (combined.includes('gallery') || combined.includes('portfolio')) return 'gallery';
  if (combined.includes('stat') || combined.includes('metric')) return 'stats';
  return 'general';
}

function humanizeName(category: string, type: BlockType, layer: Layer): string {
  const text = getLayerText(layer).trim();
  if (text) {
    return `${capitalize(category)} - ${text.slice(0, 36)}`;
  }

  return `${capitalize(category)} ${type}`;
}

export function extractBlocks(rootLayer: Layer, templateName: string): ExtractedBlock[] {
  const extracted: ExtractedBlock[] = [
    {
      name: templateName,
      type: 'layout',
      category: detectCategory(rootLayer),
      layer: cloneDeep(rootLayer),
    },
  ];

  function visit(layer: Layer, depth: number) {
    if (depth > 0) {
      const type = detectBlockType(layer, depth);
      const category = detectCategory(layer);
      extracted.push({
        name: humanizeName(category, type, layer),
        type,
        category,
        layer: cloneDeep(layer),
      });
    }

    if (depth >= 3) return;
    layer.children?.forEach((child) => visit(child, depth + 1));
  }

  rootLayer.children?.forEach((child) => visit(child, 1));

  return extracted;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
