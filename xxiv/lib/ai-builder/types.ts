import { z } from 'zod';

export const AI_BUILDER_SECTION_TYPES = [
  'hero',
  'features',
  'about',
  'services',
  'pricing',
  'testimonials',
  'contact',
  'footer',
  'gallery',
  'faq',
] as const;

export const AI_BUILDER_PROVIDER_IDS = ['anthropic', 'groq'] as const;
export const AI_BUILDER_INPUT_SOURCES = ['prompt', 'url', 'upload'] as const;
export const AI_BUILDER_COLLECTION_FIELD_TYPES = [
  'text',
  'number',
  'boolean',
  'date',
  'date_only',
  'reference',
  'multi_reference',
  'rich_text',
  'image',
  'audio',
  'video',
  'document',
  'link',
  'email',
  'phone',
  'color',
  'status',
] as const;

export const aiBuilderSectionSchema = z.object({
  type: z.enum(AI_BUILDER_SECTION_TYPES),
  heading: z.string().default(''),
  subheading: z.string().default(''),
  body: z.string().default(''),
  ctaText: z.string().default(''),
  ctaLink: z.string().default(''),
  imageDescription: z.string().default(''),
});

export const aiBuilderPageSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(1),
  sections: z.array(aiBuilderSectionSchema).min(1),
});

export const aiBuilderCollectionFieldSchema = z.object({
  name: z.string().min(1),
  key: z.string().min(1).optional(),
  type: z.enum(AI_BUILDER_COLLECTION_FIELD_TYPES),
  referenceCollectionName: z.string().min(1).optional(),
});

export const aiBuilderCollectionSchema = z.object({
  name: z.string().min(1),
  fields: z.array(aiBuilderCollectionFieldSchema).min(1),
  items: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))).default([]),
});

export const aiBuilderGlobalSeoSchema = z.object({
  siteTitle: z.string().min(1).optional(),
  siteDescription: z.string().min(1).optional(),
});

export const aiBuilderSitePlanSchema = z.object({
  siteName: z.string().min(1),
  palette: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  fonts: z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
  }),
  pages: z.array(aiBuilderPageSchema).min(1),
  collections: z.array(aiBuilderCollectionSchema).default([]),
  globalSeo: aiBuilderGlobalSeoSchema.optional(),
});

export const aiBuilderGenerateRequestSchema = z.object({
  siteName: z.string().trim().min(1).optional(),
  provider: z.enum(AI_BUILDER_PROVIDER_IDS).optional(),
  model: z.string().trim().min(1).optional(),
  inputSource: z.enum(AI_BUILDER_INPUT_SOURCES).optional(),
  prompt: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  imageBase64: z.string().trim().min(1).optional(),
  imageMediaType: z.enum(['image/png', 'image/jpeg', 'image/webp']).optional(),
  referenceUrl: z.string().trim().url().optional(),
  projectId: z.string().uuid(),
}).superRefine((payload, ctx) => {
  const hasPrompt = Boolean(payload.prompt || payload.description);
  const hasImage = Boolean(payload.imageBase64);
  const hasReferenceUrl = Boolean(payload.referenceUrl);

  if (!hasPrompt && !hasImage && !hasReferenceUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide a prompt, a design upload, or a reference URL',
    });
  }
});

export const aiBuilderBuildRequestSchema = z.object({
  projectId: z.string().uuid(),
  sitePlan: aiBuilderSitePlanSchema,
});

export type AiBuilderSection = z.infer<typeof aiBuilderSectionSchema>;
export type AiBuilderPage = z.infer<typeof aiBuilderPageSchema>;
export type AiBuilderSitePlan = z.infer<typeof aiBuilderSitePlanSchema>;
export type AiBuilderGenerateRequest = z.infer<typeof aiBuilderGenerateRequestSchema>;
export type AiBuilderBuildRequest = z.infer<typeof aiBuilderBuildRequestSchema>;
export type AiBuilderProviderId = typeof AI_BUILDER_PROVIDER_IDS[number];
export type AiBuilderInputSource = typeof AI_BUILDER_INPUT_SOURCES[number];
export type AiBuilderCollection = z.infer<typeof aiBuilderCollectionSchema>;
export type AiBuilderCollectionField = z.infer<typeof aiBuilderCollectionFieldSchema>;

export type AiBuilderLogStatus = 'planning' | 'building' | 'completed' | 'failed';
export type AiBuilderInputType = 'text' | 'image';

export type AiBuilderProgressStage =
  | 'analyzing'
  | 'planning'
  | 'creating-pages'
  | 'styling'
  | 'publishing'
  | 'completed'
  | 'failed';
