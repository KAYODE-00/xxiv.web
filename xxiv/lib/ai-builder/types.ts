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
});

export const aiBuilderGenerateRequestSchema = z.object({
  description: z.string().trim().min(1).optional(),
  imageBase64: z.string().trim().min(1).optional(),
  imageMediaType: z.enum(['image/png', 'image/jpeg', 'image/webp']).optional(),
  projectId: z.string().uuid(),
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
