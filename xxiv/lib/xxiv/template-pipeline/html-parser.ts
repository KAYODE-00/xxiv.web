import { parse, HTMLElement, Node, TextNode } from 'node-html-parser';

export interface ParsedNode {
  tag: string;
  classes: string[];
  attributes: Record<string, string>;
  textContent: string | null;
  children: ParsedNode[];
  isTextOnly: boolean;
  rawHtml?: string;
}

const ROOT_TAG_FALLBACKS = 'div, section, nav, header, footer, main, article, aside, form';
const STRIP_TAGS = ['script', 'style', 'noscript'];
const ATTRIBUTE_ALLOWLIST = new Set([
  'href',
  'src',
  'alt',
  'type',
  'placeholder',
  'name',
  'id',
  'for',
  'target',
  'rel',
  'value',
  'action',
  'method',
  'poster',
  'controls',
  'autoplay',
  'muted',
  'loop',
  'preload',
  'loading',
  'width',
  'height',
  'aria-label',
  'role',
  'title',
]);

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\s+on\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .trim();
}

function sanitizeAttributeValue(value: string): string {
  const trimmed = value.trim();

  if (/^javascript:/i.test(trimmed)) {
    return '';
  }

  return trimmed;
}

function convertTextNode(node: TextNode): ParsedNode | null {
  const text = node.rawText.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  return {
    tag: '#text',
    classes: [],
    attributes: {},
    textContent: text,
    children: [],
    isTextOnly: true,
  };
}

function isMeaningfulNode(node: Node): boolean {
  if (node instanceof TextNode) {
    return node.rawText.trim().length > 0;
  }

  if (node instanceof HTMLElement) {
    return !STRIP_TAGS.includes(node.tagName.toLowerCase());
  }

  return false;
}

function convertNode(node: Node): ParsedNode | null {
  if (node instanceof TextNode) {
    return convertTextNode(node);
  }

  if (!(node instanceof HTMLElement)) {
    return null;
  }

  const tagName = (node.tagName || 'div').toLowerCase();
  if (STRIP_TAGS.includes(tagName)) {
    return null;
  }

  const classes = (node.getAttribute('class') || '')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const attributes: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(node.attributes || {})) {
    if (key === 'class' || key.startsWith('on') || !ATTRIBUTE_ALLOWLIST.has(key)) {
      continue;
    }

    const value = sanitizeAttributeValue(String(rawValue));
    if (value) {
      attributes[key] = value;
    }
  }

  const convertedChildren = (node.childNodes || [])
    .map((child) => convertNode(child))
    .filter((child): child is ParsedNode => Boolean(child));

  const nonTextChildren = convertedChildren.filter((child) => child.tag !== '#text');
  const textChildren = convertedChildren.filter((child) => child.tag === '#text');
  const flattenedText = textChildren.map((child) => child.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
  const isTextOnly = nonTextChildren.length === 0 && Boolean(flattenedText);

  return {
    tag: tagName,
    classes,
    attributes,
    textContent: isTextOnly ? flattenedText : flattenedText || null,
    children: isTextOnly ? [] : nonTextChildren,
    isTextOnly,
    rawHtml: node.toString(),
  };
}

export function parseHTML(html: string): ParsedNode {
  const cleaned = sanitizeHtml(html);
  const root = parse(cleaned);

  const topLevelNodes = (root.childNodes || []).filter(isMeaningfulNode);
  const topLevelElements = topLevelNodes
    .map((node) => convertNode(node))
    .filter((node): node is ParsedNode => Boolean(node));

  if (topLevelElements.length === 1) {
    return topLevelElements[0];
  }

  if (topLevelElements.length > 1) {
    return {
      tag: 'div',
      classes: [],
      attributes: {},
      textContent: null,
      children: topLevelElements.filter((node) => node.tag !== '#text'),
      isTextOnly: false,
    };
  }

  const firstElement =
    (root.firstChild instanceof HTMLElement ? root.firstChild : null) ||
    root.querySelector(ROOT_TAG_FALLBACKS);

  const converted = firstElement ? convertNode(firstElement) : null;
  if (converted) {
    return converted;
  }

  return {
    tag: 'div',
    classes: [],
    attributes: {},
    textContent: null,
    children: [],
    isTextOnly: false,
  };
}
