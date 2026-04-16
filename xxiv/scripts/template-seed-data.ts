import type { Layer, PageSettings } from '../types/index.ts';

export interface SeedTemplatePage {
  id: string;
  name: string;
  slug: string;
  is_index: boolean;
  page_order: number;
  settings: PageSettings;
  layers: Layer[];
}

export interface SeedTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  preview_url: string | null;
  tags: string[];
  is_featured: boolean;
  sort_order: number;
  pages: SeedTemplatePage[];
}

const HOME_PAGE_ID = '11111111-1111-4111-8111-111111111111';
const ABOUT_PAGE_ID = '22222222-2222-4222-8222-222222222222';

export const templateSeedData: SeedTemplate[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Midnight Studio',
    slug: 'midnight-studio',
    description: 'A sharp landing-site starter for creative studios, agencies, and premium personal brands.',
    category: 'Creative',
    thumbnail_url: null,
    preview_url: null,
    tags: ['Agency', 'Portfolio', 'Landing Page'],
    is_featured: true,
    sort_order: 1,
    pages: [
      {
        id: HOME_PAGE_ID,
        name: 'Home',
        slug: '',
        is_index: true,
        page_order: 0,
        settings: {
          seo: {
            image: null,
            title: 'Midnight Studio',
            description: 'A cinematic creative template for ambitious brands.',
            noindex: false,
          },
        },
        layers: [
          {
            id: 'body',
            name: 'body',
            classes: 'bg-black text-white min-h-screen',
            children: [
              {
                id: 'hero-section',
                name: 'section',
                classes: 'min-h-screen flex flex-col justify-center px-6 py-24 sm:px-10 lg:px-16',
                children: [
                  {
                    id: 'eyebrow',
                    name: 'text',
                    classes: 'uppercase tracking-[0.35em] text-xs text-zinc-400 mb-6',
                    variables: {
                      text: {
                        type: 'dynamic_text',
                        data: { content: 'Creative Template' },
                      },
                    },
                  },
                  {
                    id: 'headline',
                    name: 'text',
                    classes: 'text-5xl sm:text-6xl lg:text-7xl font-semibold max-w-4xl leading-none',
                    variables: {
                      text: {
                        type: 'dynamic_text',
                        data: { content: 'Launch a sharper digital presence in one build.' },
                      },
                    },
                  },
                  {
                    id: 'body-copy',
                    name: 'text',
                    classes: 'text-base sm:text-lg text-zinc-300 max-w-2xl mt-6 leading-8',
                    variables: {
                      text: {
                        type: 'dynamic_text',
                        data: {
                          content:
                            'Start from a polished structure, replace the content, and publish through the standard XXIV flow.',
                        },
                      },
                    },
                  },
                  {
                    id: 'cta-row',
                    name: 'div',
                    classes: 'flex flex-wrap gap-4 mt-10',
                    children: [
                      {
                        id: 'cta-about',
                        name: 'button',
                        classes: 'px-5 py-3 rounded-full bg-white text-black font-medium',
                        variables: {
                          text: {
                            type: 'dynamic_text',
                            data: { content: 'Explore the story' },
                          },
                          link: {
                            type: 'page',
                            page: {
                              id: ABOUT_PAGE_ID,
                              collection_item_id: null,
                            },
                            target: '_self',
                            download: false,
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: ABOUT_PAGE_ID,
        name: 'About',
        slug: 'about',
        is_index: false,
        page_order: 1,
        settings: {
          seo: {
            image: null,
            title: 'About Midnight Studio',
            description: 'Learn about the team and process behind the studio.',
            noindex: false,
          },
        },
        layers: [
          {
            id: 'body',
            name: 'body',
            classes: 'bg-black text-white min-h-screen',
            children: [
              {
                id: 'about-shell',
                name: 'section',
                classes: 'max-w-4xl mx-auto px-6 py-24 sm:px-10',
                children: [
                  {
                    id: 'about-title',
                    name: 'text',
                    classes: 'text-4xl sm:text-5xl font-semibold leading-tight',
                    variables: {
                      text: {
                        type: 'dynamic_text',
                        data: { content: 'A calm, premium structure for your next site.' },
                      },
                    },
                  },
                  {
                    id: 'about-copy',
                    name: 'text',
                    classes: 'mt-6 text-zinc-300 leading-8 text-base',
                    variables: {
                      text: {
                        type: 'dynamic_text',
                        data: {
                          content:
                            'This page intentionally links back to the homepage so cloning can verify internal page IDs are remapped correctly.',
                        },
                      },
                    },
                  },
                  {
                    id: 'back-home',
                    name: 'button',
                    classes: 'mt-10 px-5 py-3 rounded-full border border-zinc-700 text-white',
                    variables: {
                      text: {
                        type: 'dynamic_text',
                        data: { content: 'Back home' },
                      },
                      link: {
                        type: 'page',
                        page: {
                          id: HOME_PAGE_ID,
                          collection_item_id: null,
                        },
                        target: '_self',
                        download: false,
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
