import type { AiBuilderSitePlan } from '@/lib/ai-builder/types';

export const AI_BUILDER_SYSTEM_PROMPT = `You are an expert web designer and developer. Your job is to analyze
the user's input (text description, uploaded design image, figma export, screenshot,
or reference website URL) and create a complete website plan.

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
  "globalSeo": {
    "siteTitle": "string",
    "siteDescription": "string"
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
  ],
  "collections": [
    {
      "name": "string",
      "fields": [
        {
          "name": "string",
          "key": "string",
          "type": "text | number | boolean | date | date_only | reference | multi_reference | rich_text | image | audio | video | document | link | email | phone | color | status",
          "referenceCollectionName": "string (only for reference fields)"
        }
      ],
      "items": [
        {
          "fieldKeyOrName": "value"
        }
      ]
    }
  ]
}

Guidelines:
- Create 4-6 pages for most websites (Home, About, Services/Products, Contact at minimum)
- Hero sections must have compelling, business-specific headlines (not generic placeholders)
- All text content must be realistic, professional, and specific to the business described
- Color palettes must be cohesive and professional
- Font pairings: use Google Fonts and pick fonts appropriate to the business type
- If the user uploads an image, figma export, or screenshot, recreate the layout structure and color
  scheme from the image, but fill with business-appropriate content
- If the user provides a reference website URL, infer its information architecture, tone,
  and section composition, but rewrite the content so it is unique to the user's brand
- Every page needs at least 3 sections
- Home page needs at least: hero, features/services, and a CTA section
- Always include a footer section on every page
- Contact page must include a contact form section
- SEO titles should be under 60 characters
- SEO descriptions should be under 160 characters
- Slugs: home page = /, all others = /page-name (lowercase, hyphens)
- Include 0-2 CMS collections when the site would clearly benefit from structured content
  such as blog posts, projects, team members, testimonials, menu items, or case studies
- Collections should include realistic starter items the builder can create immediately
- Use rich_text for long-form body fields and image for visual fields when appropriate`;

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
    collections: plan.collections || [],
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
    throw new Error('The AI provider did not return a JSON object');
  }

  return JSON.parse(trimmed.slice(start, end + 1)) as AiBuilderSitePlan;
}
