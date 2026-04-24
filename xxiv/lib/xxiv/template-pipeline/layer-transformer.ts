import { createDynamicRichTextVariable, createDynamicTextVariable, createStaticTextVariable } from '@/lib/variable-utils';
import { generateId } from '@/lib/utils';
import type { Layer, LayerSettings, LayerVariables } from '@/types';
import type { ParsedNode } from './html-parser';

const CONTAINER_TAGS = new Set(['div', 'section', 'nav', 'header', 'footer', 'main', 'article', 'aside', 'ul', 'ol', 'li']);
const TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'strong', 'em', 'small']);

function mapTagToLayerName(tag: string): Layer['name'] {
  if (CONTAINER_TAGS.has(tag)) return 'div';
  if (TEXT_TAGS.has(tag)) return 'text';
  if (tag === 'a') return 'link';
  if (tag === 'button') return 'button';
  if (tag === 'img') return 'image';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
  if (tag === 'form') return 'form';
  if (tag === 'svg') return 'icon';
  if (tag === 'video') return 'video';
  if (tag === 'audio') return 'audio';
  if (tag === 'iframe') return 'div';
  return 'div';
}

function normalizeClasses(classes: string[]): string {
  return classes.join(' ').trim();
}

function dedupeChildren(children: ParsedNode[]): ParsedNode[] {
  const seen = new Set<string>();

  return children.filter((child) => {
    const fingerprint = [
      child.tag,
      child.classes.join(','),
      child.attributes.href || '',
      child.attributes.src || '',
      child.textContent || '',
      child.rawHtml || '',
    ].join('|');

    if ((child.tag === 'svg' || child.tag === 'path' || child.tag === 'button' || child.tag === 'div') && seen.has(fingerprint)) {
      return false;
    }

    seen.add(fingerprint);
    return true;
  });
}

function collectText(node: ParsedNode): string {
  const directText = node.textContent?.trim();
  if (directText) {
    return directText;
  }

  return node.children
    .map((child) => collectText(child))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createRichTextDocument(content: string) {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: content }],
      },
    ],
  });
}

function buildTextVariables(tag: string, content: string): LayerVariables | undefined {
  const trimmed = content.trim();
  if (!trimmed) return undefined;

  if (tag === 'p') {
    return {
      text: createDynamicRichTextVariable(createRichTextDocument(trimmed)),
    };
  }

  return {
    text: createStaticTextVariable(trimmed),
  } as LayerVariables;
}

function buildSettings(tag: string, attributes: Record<string, string>, classes: string): LayerSettings | undefined {
  const settings: LayerSettings = {};

  if (tag !== 'div' && tag !== 'a' && tag !== 'button' && tag !== 'img' && tag !== 'input' && tag !== 'form' && tag !== 'video' && tag !== 'audio' && tag !== 'svg') {
    settings.tag = tag;
  }

  if (CONTAINER_TAGS.has(tag) && tag !== 'div') {
    settings.tag = tag;
  }

  if (tag === 'iframe') {
    const src = attributes.src || '';
    const title = attributes.title ? ` title="${attributes.title.replace(/"/g, '&quot;')}"` : '';
    settings.htmlEmbed = {
      code: `<iframe src="${src.replace(/"/g, '&quot;')}" class="${classes.replace(/"/g, '&quot;')}" loading="lazy"${title}></iframe>`,
    };
  }

  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const customAttributes: Record<string, string> = {};

    if (tag === 'textarea') {
      customAttributes.type = 'textarea';
    } else if (tag === 'select') {
      customAttributes.type = 'select';
    } else if (attributes.type) {
      customAttributes.type = attributes.type;
    }

    for (const key of ['placeholder', 'name', 'value']) {
      if (attributes[key]) {
        customAttributes[key] = attributes[key];
      }
    }

    if (Object.keys(customAttributes).length > 0) {
      settings.customAttributes = customAttributes;
    }

    if (attributes.id) {
      settings.id = attributes.id;
    }
  }

  if (tag === 'form') {
    settings.form = {
      success_action: 'message',
      success_message: "Thanks! We'll be in touch.",
      email_notification: {
        enabled: false,
        to: '',
        subject: 'New form submission',
      },
    };
  }

  return Object.keys(settings).length > 0 ? settings : undefined;
}

function buildAttributes(tag: string, attributes: Record<string, string>): Layer['attributes'] | undefined {
  if (tag === 'video' || tag === 'audio') {
    const layerAttributes: NonNullable<Layer['attributes']> = {};

    for (const key of ['controls', 'muted', 'loop', 'autoplay', 'preload']) {
      if (attributes[key]) {
        if (['controls', 'muted', 'loop', 'autoplay'].includes(key)) {
          layerAttributes[key as keyof typeof layerAttributes] = true;
        } else {
          layerAttributes[key as keyof typeof layerAttributes] = attributes[key];
        }
      }
    }

    return Object.keys(layerAttributes).length > 0 ? layerAttributes : undefined;
  }

  return undefined;
}

export function transformNodeToLayer(node: ParsedNode): Layer | null {
  if (!node || node.tag === '#text') {
    return null;
  }

  const name = mapTagToLayerName(node.tag);
  const classes = normalizeClasses(node.classes);
  const settings = buildSettings(node.tag, node.attributes, classes);
  const textContent = collectText(node);

  const layer: Layer = {
    id: generateId('lyr'),
    name,
    classes,
    open: false,
    children: [],
  };

  if (settings) {
    layer.settings = settings;
  }

  const attributes = buildAttributes(node.tag, node.attributes);
  if (attributes) {
    layer.attributes = attributes;
  }

  if (name === 'text' || name === 'button' || name === 'link') {
    const textVariables = buildTextVariables(node.tag, textContent);
    if (textVariables) {
      layer.variables = {
        ...(layer.variables || {}),
        ...textVariables,
      };
    }
  }

  if (name === 'image') {
    layer.variables = {
      image: {
        src: createDynamicTextVariable(node.attributes.src || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800'),
        alt: createDynamicTextVariable(node.attributes.alt || 'Image'),
      },
    };
    return layer;
  }

  if (name === 'link') {
    layer.variables = {
      ...(layer.variables || {}),
      link: {
        type: 'url',
        url: createDynamicTextVariable(node.attributes.href || '#'),
      },
    };
  }

  if (name === 'button' && node.attributes.href) {
    layer.variables = {
      ...(layer.variables || {}),
      link: {
        type: 'url',
        url: createDynamicTextVariable(node.attributes.href),
      },
    };
  }

  if (name === 'icon') {
    layer.variables = {
      icon: {
        src: createStaticTextVariable(node.rawHtml || '<svg></svg>'),
      },
    };
    return layer;
  }

  if (name === 'video') {
    layer.variables = {
      video: {
        src: node.attributes.src ? createDynamicTextVariable(node.attributes.src) : undefined,
      },
    };
    return layer;
  }

  if (name === 'audio') {
    layer.variables = {
      audio: {
        src: createDynamicTextVariable(node.attributes.src || ''),
      },
    };
    return layer;
  }

  layer.children = dedupeChildren(node.children)
    .map((child) => transformNodeToLayer(child))
    .filter((child): child is Layer => Boolean(child));

  return layer;
}
