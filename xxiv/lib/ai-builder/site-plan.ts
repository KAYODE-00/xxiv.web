import type { AiBuilderSitePlan } from '@/lib/ai-builder/types';

export const AI_BUILDER_SYSTEM_PROMPT = `You are an expert web designer and developer. Your job is to analyze
the user's input (text description or uploaded design image) and create
a complete website plan.

You must respond with ONLY a valid JSON object. No markdown code blocks.
No explanation text. No preamble. Just the raw JSON.

The JSON must follow this exact schema:
{
  "siteName": "string",
  "palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "fonts": {
    "heading": "Font Name",
    "body": "Font Name"
  },
  "pages": [
    {
      "name": "string",
      "slug": "string (/ for home, /about for about etc)",
      "seoTitle": "string",
      "seoDescription": "string",
      "sections": [
        {
          "type": "hero | features | about | services | pricing | testimonials | contact | footer | gallery | faq",
          "heading": "string",
          "subheading": "string",
          "body": "string",
          "ctaText": "string",
          "ctaLink": "string",
          "imageDescription": "string (describe what image should be here)"
        }
      ]
    }
  ]
}

Guidelines:
- Create 4-6 pages for most websites (Home, About, Services/Products,
  Contact at minimum)
- Hero sections must have compelling, business-specific headlines
  (not generic placeholders)
- All text content must be realistic, professional, and specific to
  the business described
- Color palettes must be cohesive and professional
- Font pairings: use Google Fonts — pick fonts appropriate to the
  business type (luxury = serif heading, tech = modern sans, etc.)
- If user uploads an image, recreate the layout structure and color
  scheme from the image, but fill with business-appropriate content
- Every page needs at least 3 sections
- Home page needs at least: hero, features/services, and a CTA section
- Always include a footer section on every page
- Contact page must include a contact form section
- SEO titles should be under 60 characters
- SEO descriptions should be under 160 characters
- slugs: home page = /, all others = /page-name (lowercase, hyphens)`;

export function normalizeSitePlan(plan: AiBuilderSitePlan): AiBuilderSitePlan {
  const pages = plan.pages.map((page, index) => {
    const rawSlug = page.slug.trim();
    const normalizedSlug = index === 0 || rawSlug === '/' ? '/' : `/${rawSlug.replace(/^\/+/, '').toLowerCase()}`;
    const sections = page.sections.length > 0 ? [...page.sections] : [];

    if (!sections.some((section) => section.type === 'footer')) {
      sections.push({
        type: 'footer',
        heading: `${plan.siteName} Footer`,
        subheading: '',
        body: `Stay connected with ${plan.siteName}.`,
        ctaText: '',
        ctaLink: '',
        imageDescription: '',
      });
    }

    return {
      ...page,
      slug: normalizedSlug,
      sections,
    };
  });

  return {
    ...plan,
    pages,
  };
}

export function extractClaudeText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((item): item is { type: 'text'; text: string } => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

export function parseSitePlanJson(raw: string): AiBuilderSitePlan {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('Claude did not return a JSON object');
  }

  return JSON.parse(trimmed.slice(start, end + 1)) as AiBuilderSitePlan;
}
