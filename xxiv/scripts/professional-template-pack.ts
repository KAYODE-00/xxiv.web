import type { Layer, LayerTemplate, PageSettings } from '../types/index.ts';

export interface ProfessionalTemplatePage {
  id: string;
  name: string;
  slug: string;
  is_index: boolean;
  page_order: number;
  settings: PageSettings;
  layers: Layer[];
}

export interface ProfessionalTemplateSeed {
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
  pages: ProfessionalTemplatePage[];
}

export interface ProfessionalBuilderTemplateSeed {
  key: string;
  name: string;
  type: 'layout' | 'element';
  category: string;
  preview_image_url?: string | null;
  source: string;
  tags?: string[];
  sort_order?: number;
  template: LayerTemplate;
}

function dtext(content: string) {
  return { type: 'dynamic_text' as const, data: { content } };
}

function text(
  id: string,
  content: string,
  classes: string,
  tag: string = 'p',
): Layer {
  return {
    id,
    name: 'text',
    classes,
    settings: { tag },
    variables: { text: dtext(content) },
  } as Layer;
}

function button(
  id: string,
  content: string,
  classes: string,
  pageId?: string,
): Layer {
  const layer: Layer = {
    id,
    name: 'button',
    classes,
    variables: { text: dtext(content) },
  } as Layer;

  if (pageId) {
    (layer.variables as any).link = {
      type: 'page',
      page: {
        id: pageId,
        collection_item_id: null,
      },
      target: '_self',
      download: false,
    };
  }

  return layer;
}

function image(id: string, query: string, alt: string, classes: string): Layer {
  return {
    id,
    name: 'image',
    classes,
    attributes: { loading: 'lazy' },
    variables: {
      image: {
        src: dtext(`https://source.unsplash.com/featured/?${query}`),
        alt: dtext(alt),
      },
    },
  } as Layer;
}

function box(id: string, classes: string, children: Layer[] = []): Layer {
  return {
    id,
    name: 'div',
    classes,
    children,
  } as Layer;
}

function section(id: string, classes: string, children: Layer[] = []): Layer {
  return {
    id,
    name: 'section',
    classes,
    children,
  } as Layer;
}

function body(classes: string, children: Layer[]): Layer {
  return {
    id: 'body',
    name: 'body',
    classes,
    children,
  } as Layer;
}

function seo(title: string, description: string): PageSettings {
  return {
    seo: {
      title,
      description,
      image: null,
      noindex: false,
    },
  } as PageSettings;
}

function simpleInput(id: string, type: string, placeholder: string): Layer {
  return {
    id,
    name: 'input',
    classes: 'w-full rounded-[14px] border border-black/10 bg-white px-[16px] py-[14px] text-[14px] text-black',
    attributes: { type, placeholder },
  } as Layer;
}

function textarea(id: string, placeholder: string): Layer {
  return {
    id,
    name: 'textarea',
    classes: 'min-h-[160px] w-full rounded-[14px] border border-black/10 bg-white px-[16px] py-[14px] text-[14px] text-black',
    attributes: { placeholder },
  } as Layer;
}

function newsletterFooter(id: string): Layer {
  return section(id, 'border-t border-black/10 px-6 py-16 md:px-10 bg-white', [
    box(`${id}-wrap`, 'mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between', [
      box(`${id}-copy`, 'max-w-2xl', [
        text(`${id}-eyebrow`, 'Newsletter subscription', 'uppercase tracking-[0.28em] text-[11px] text-black/45', 'span'),
        text(`${id}-title`, 'A composed monthly digest for people building serious brands.', 'mt-3 text-[32px] leading-[1.05] font-semibold text-black', 'h2'),
        text(`${id}-body`, 'Use this footer section to capture subscribers, send product notes, essays, event drops, or project updates.', 'mt-3 text-[15px] leading-[1.7] text-black/65'),
      ]),
      box(`${id}-form`, 'flex w-full max-w-xl flex-col gap-3 sm:flex-row', [
        simpleInput(`${id}-email`, 'email', 'Email address'),
        button(`${id}-button`, 'Subscribe', 'rounded-[14px] bg-black px-[24px] py-[14px] text-[14px] font-medium text-white'),
      ]),
    ]),
  ]);
}

const BLOG_HOME = '9c42ef01-bc61-4d30-9a10-100000000001';
const BLOG_ABOUT = '9c42ef01-bc61-4d30-9a10-100000000002';
const BLOG_CONTACT = '9c42ef01-bc61-4d30-9a10-100000000003';

const ADVISORY_HOME = '9c42ef01-bc61-4d30-9a10-200000000001';
const ADVISORY_SERVICES = '9c42ef01-bc61-4d30-9a10-200000000002';
const ADVISORY_CONTACT = '9c42ef01-bc61-4d30-9a10-200000000003';

const SAAS_HOME = '9c42ef01-bc61-4d30-9a10-300000000001';
const SAAS_FEATURES = '9c42ef01-bc61-4d30-9a10-300000000002';
const SAAS_CONTACT = '9c42ef01-bc61-4d30-9a10-300000000003';

const PORTFOLIO_HOME = '9c42ef01-bc61-4d30-9a10-400000000001';
const PORTFOLIO_PROJECTS = '9c42ef01-bc61-4d30-9a10-400000000002';
const PORTFOLIO_ABOUT = '9c42ef01-bc61-4d30-9a10-400000000003';

const LEGAL_HOME = '9c42ef01-bc61-4d30-9a10-500000000001';
const LEGAL_PRACTICE = '9c42ef01-bc61-4d30-9a10-500000000002';
const LEGAL_CONTACT = '9c42ef01-bc61-4d30-9a10-500000000003';

export const professionalTemplatePack: ProfessionalTemplateSeed[] = [
  {
    id: '9c42ef01-bc61-4d30-9a10-111111111111',
    name: 'Monochrome Journal',
    slug: 'monochrome-journal',
    description: 'A rigorous editorial blog template with a monochrome palette, featured storytelling, author pages, and contact flow.',
    category: 'Blog',
    thumbnail_url: 'https://source.unsplash.com/featured/?minimalist,editorial,black-and-white',
    preview_url: null,
    tags: ['Blog', 'Editorial', 'Minimal', 'B&W'],
    is_featured: true,
    sort_order: 1,
    pages: [
      {
        id: BLOG_HOME,
        name: 'Home',
        slug: '',
        is_index: true,
        page_order: 0,
        settings: seo('Monochrome Journal', 'A minimalist publication template for essays, interviews, and culture writing.'),
        layers: [
          body('bg-white text-black min-h-screen', [
            section('blog-nav', 'sticky top-0 z-20 border-b border-black/10 bg-white/90 px-6 py-5 backdrop-blur md:px-10', [
              box('blog-nav-wrap', 'mx-auto flex max-w-6xl items-center justify-between gap-6', [
                text('blog-brand', 'MONOCHROME', 'text-[14px] font-semibold tracking-[0.28em] uppercase text-black', 'span'),
                box('blog-nav-links', 'hidden items-center gap-6 md:flex', [
                  text('blog-link-1', 'Journal', 'text-[13px] uppercase tracking-[0.16em] text-black/55', 'span'),
                  text('blog-link-2', 'Essays', 'text-[13px] uppercase tracking-[0.16em] text-black/55', 'span'),
                  text('blog-link-3', 'About', 'text-[13px] uppercase tracking-[0.16em] text-black/55', 'span'),
                ]),
                box('blog-auth', 'flex items-center gap-3', [
                  button('blog-login', 'Sign In', 'rounded-full border border-black/10 px-[16px] py-[10px] text-[13px] text-black'),
                  button('blog-signup', 'Subscribe', 'rounded-full bg-black px-[18px] py-[10px] text-[13px] text-white'),
                ]),
              ]),
            ]),
            section('blog-hero', 'px-6 py-16 md:px-10 lg:px-16', [
              box('blog-hero-grid', 'mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center', [
                box('blog-hero-copy', 'max-w-2xl', [
                  text('blog-hero-kicker', 'Featured Essay', 'uppercase tracking-[0.32em] text-[11px] text-black/45', 'span'),
                  text('blog-hero-title', 'A sharper publishing system for thoughtful teams that still care about print-like pacing.', 'mt-5 text-[52px] leading-[0.94] font-semibold tracking-[-0.05em] text-black md:text-[76px]', 'h1'),
                  text('blog-hero-body', 'Monochrome Journal balances severe typography, image-led storytelling, and reusable post structures for newsletters, magazines, studios, and founders building an editorial voice.', 'mt-6 max-w-xl text-[16px] leading-[1.85] text-black/68'),
                  box('blog-hero-meta', 'mt-8 flex flex-wrap gap-3', [
                    text('blog-hero-tag1', 'Culture', 'rounded-full border border-black/10 px-[14px] py-[8px] text-[12px] uppercase tracking-[0.18em] text-black/55'),
                    text('blog-hero-tag2', 'Design', 'rounded-full border border-black/10 px-[14px] py-[8px] text-[12px] uppercase tracking-[0.18em] text-black/55'),
                    text('blog-hero-tag3', 'Systems', 'rounded-full border border-black/10 px-[14px] py-[8px] text-[12px] uppercase tracking-[0.18em] text-black/55'),
                  ]),
                ]),
                image('blog-hero-image', 'minimalist,architecture,black-and-white', 'Featured post visual', 'h-[520px] w-full rounded-[28px] object-cover'),
              ]),
            ]),
            section('blog-grid', 'px-6 py-8 md:px-10 lg:px-16', [
              box('blog-grid-shell', 'mx-auto flex max-w-6xl flex-col gap-8', [
                text('blog-grid-title', 'Latest posts', 'text-[24px] font-semibold tracking-[-0.03em] text-black', 'h2'),
                box('blog-grid-cards', 'grid gap-6 md:grid-cols-2 xl:grid-cols-3', [
                  box('post-card-1', 'flex flex-col overflow-hidden rounded-[24px] border border-black/10 bg-white', [
                    image('post-card-1-image', 'minimalist,interior,shadow', 'Minimal interior', 'h-[240px] w-full object-cover transition-transform duration-300 hover:-translate-y-1'),
                    box('post-card-1-body', 'flex flex-col gap-4 p-6', [
                      text('post-card-1-tag', 'Perspective', 'text-[11px] uppercase tracking-[0.24em] text-black/45', 'span'),
                      text('post-card-1-title', 'Why restrained design systems often scale faster than expressive ones.', 'text-[24px] leading-[1.2] font-semibold tracking-[-0.03em] text-black', 'h3'),
                      text('post-card-1-copy', 'A concise breakdown of decision fatigue, governance, and what it takes to keep visual quality high in growing teams.', 'text-[15px] leading-[1.75] text-black/62'),
                    ]),
                  ]),
                  box('post-card-2', 'flex flex-col overflow-hidden rounded-[24px] border border-black/10 bg-white', [
                    image('post-card-2-image', 'brutalist,monochrome,workspace', 'Workspace scene', 'h-[240px] w-full object-cover transition-transform duration-300 hover:-translate-y-1'),
                    box('post-card-2-body', 'flex flex-col gap-4 p-6', [
                      text('post-card-2-tag', 'Interview', 'text-[11px] uppercase tracking-[0.24em] text-black/45', 'span'),
                      text('post-card-2-title', 'Inside the weekly publishing ritual behind disciplined creative organizations.', 'text-[24px] leading-[1.2] font-semibold tracking-[-0.03em] text-black', 'h3'),
                      text('post-card-2-copy', 'Use this card stack for interviews, essays, notes, and issue drops without losing the gallery\'s visual rhythm.', 'text-[15px] leading-[1.75] text-black/62'),
                    ]),
                  ]),
                  box('post-card-3', 'flex flex-col overflow-hidden rounded-[24px] border border-black/10 bg-white', [
                    image('post-card-3-image', 'gallery,black-and-white,staircase', 'Gallery staircase', 'h-[240px] w-full object-cover transition-transform duration-300 hover:-translate-y-1'),
                    box('post-card-3-body', 'flex flex-col gap-4 p-6', [
                      text('post-card-3-tag', 'Opinion', 'text-[11px] uppercase tracking-[0.24em] text-black/45', 'span'),
                      text('post-card-3-title', 'The case for fewer homepage messages and more conviction in your editorial brand.', 'text-[24px] leading-[1.2] font-semibold tracking-[-0.03em] text-black', 'h3'),
                      text('post-card-3-copy', 'This template keeps a strict monochrome tone while still giving every article enough contrast and breathing room.', 'text-[15px] leading-[1.75] text-black/62'),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            newsletterFooter('blog-footer-newsletter'),
          ]),
        ],
      },
      {
        id: BLOG_ABOUT,
        name: 'About',
        slug: 'about',
        is_index: false,
        page_order: 1,
        settings: seo('About Monochrome Journal', 'A minimal editorial about page with mission, portrait, and approach.'),
        layers: [
          body('bg-[#f6f6f3] text-black min-h-screen', [
            section('blog-about-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('blog-about-grid', 'mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center', [
                image('blog-about-image', 'minimalist,portrait,studio', 'Editorial portrait', 'h-[560px] w-full rounded-[28px] object-cover'),
                box('blog-about-copy', 'max-w-xl', [
                  text('blog-about-kicker', 'About the publication', 'uppercase tracking-[0.28em] text-[11px] text-black/45', 'span'),
                  text('blog-about-title', 'A publication for founders, designers, and cultural operators who prefer depth over noise.', 'mt-4 text-[46px] leading-[1] font-semibold tracking-[-0.05em] text-black', 'h1'),
                  text('blog-about-body', 'The split-screen format gives you a calm, high-credibility setting for a mission statement, founder story, manifesto, or editorial promise. It is intentionally sparse so every update still feels deliberate.', 'mt-5 text-[16px] leading-[1.8] text-black/65'),
                  button('blog-about-cta', 'Contact the team', 'mt-8 rounded-full bg-black px-[18px] py-[12px] text-[14px] text-white', BLOG_CONTACT),
                ]),
              ]),
            ]),
          ]),
        ],
      },
      {
        id: BLOG_CONTACT,
        name: 'Contact',
        slug: 'contact',
        is_index: false,
        page_order: 2,
        settings: seo('Contact Monochrome Journal', 'A minimalist contact page with inquiry form and success-state copy block.'),
        layers: [
          body('bg-white text-black min-h-screen', [
            section('blog-contact-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('blog-contact-grid', 'mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]', [
                box('blog-contact-copy', 'max-w-md', [
                  text('blog-contact-kicker', 'Contact', 'uppercase tracking-[0.28em] text-[11px] text-black/45', 'span'),
                  text('blog-contact-title', 'Pitch an essay, suggest a guest, or send an editorial brief.', 'mt-4 text-[42px] leading-[1.04] font-semibold tracking-[-0.04em] text-black', 'h1'),
                  text('blog-contact-body', 'The right-hand panel is ready for your primary inquiry flow. A secondary confirmation block is included below the form to represent a simple success state in the layout.', 'mt-5 text-[15px] leading-[1.8] text-black/64'),
                ]),
                box('blog-contact-form-card', 'rounded-[28px] border border-black/10 bg-[#fafafa] p-8', [
                  simpleInput('blog-contact-name', 'text', 'Name'),
                  box('blog-contact-gap-1', 'h-4'),
                  simpleInput('blog-contact-email', 'email', 'Email'),
                  box('blog-contact-gap-2', 'h-4'),
                  textarea('blog-contact-message', 'Tell us what you are working on'),
                  box('blog-contact-gap-3', 'h-5'),
                  button('blog-contact-submit', 'Send inquiry', 'rounded-[14px] bg-black px-[18px] py-[14px] text-[14px] font-medium text-white'),
                  box('blog-contact-success', 'mt-8 rounded-[18px] border border-black/10 bg-white p-5', [
                    text('blog-contact-success-title', 'Success state', 'text-[16px] font-semibold text-black', 'h3'),
                    text('blog-contact-success-copy', 'Thanks. Your confirmation, scheduling note, or next-step message can live in this secondary panel.', 'mt-2 text-[14px] leading-[1.7] text-black/60'),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ],
      },
    ],
  },
  {
    id: '9c42ef01-bc61-4d30-9a10-222222222222',
    name: 'Atlas Advisory',
    slug: 'atlas-advisory',
    description: 'A polished advisory template for consulting firms, strategy boutiques, and executive service businesses.',
    category: 'Business',
    thumbnail_url: 'https://source.unsplash.com/featured/?consulting,boardroom,architecture',
    preview_url: null,
    tags: ['Business', 'Consulting', 'Advisory'],
    is_featured: true,
    sort_order: 2,
    pages: [
      {
        id: ADVISORY_HOME,
        name: 'Home',
        slug: '',
        is_index: true,
        page_order: 0,
        settings: seo('Atlas Advisory', 'A premium advisory site template with executive positioning and service credibility.'),
        layers: [
          body('bg-[#f7f3ee] text-[#171717] min-h-screen', [
            section('adv-hero', 'px-6 py-16 md:px-10 lg:px-16', [
              box('adv-hero-grid', 'mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center', [
                box('adv-hero-copy', 'max-w-xl', [
                  text('adv-kicker', 'Executive advisory', 'uppercase tracking-[0.3em] text-[11px] text-[#7b6f62]', 'span'),
                  text('adv-title', 'Clarity for complex growth decisions, capital moments, and operational pivots.', 'mt-4 text-[58px] leading-[0.96] font-semibold tracking-[-0.05em] text-[#171717]', 'h1'),
                  text('adv-body', 'Atlas Advisory is structured for firms that sell trust, rigor, and board-level perspective. Use it for strategy, finance, transformation, market entry, or leadership consulting.', 'mt-5 text-[16px] leading-[1.8] text-[#4e463d]'),
                  box('adv-buttons', 'mt-8 flex flex-wrap gap-3', [
                    button('adv-services-btn', 'Explore services', 'rounded-full bg-[#171717] px-[18px] py-[12px] text-[14px] text-white', ADVISORY_SERVICES),
                    button('adv-contact-btn', 'Book an introduction', 'rounded-full border border-[#171717]/10 px-[18px] py-[12px] text-[14px] text-[#171717]', ADVISORY_CONTACT),
                  ]),
                ]),
                image('adv-hero-image', 'boardroom,glass,architecture', 'Boardroom architecture', 'h-[580px] w-full rounded-[30px] object-cover'),
              ]),
            ]),
            section('adv-proof', 'px-6 py-6 md:px-10 lg:px-16', [
              box('adv-proof-shell', 'mx-auto grid max-w-6xl gap-6 md:grid-cols-3', [
                box('adv-proof-1', 'rounded-[24px] bg-white p-7', [
                  text('adv-proof-1-title', 'C-suite positioning', 'text-[20px] font-semibold text-[#171717]', 'h3'),
                  text('adv-proof-1-copy', 'Introduce a disciplined narrative around the advisory problem you solve best.', 'mt-3 text-[14px] leading-[1.75] text-[#5f574d]'),
                ]),
                box('adv-proof-2', 'rounded-[24px] bg-white p-7', [
                  text('adv-proof-2-title', 'Offer architecture', 'text-[20px] font-semibold text-[#171717]', 'h3'),
                  text('adv-proof-2-copy', 'Present flagship services, retainers, workshops, or transaction support clearly.', 'mt-3 text-[14px] leading-[1.75] text-[#5f574d]'),
                ]),
                box('adv-proof-3', 'rounded-[24px] bg-white p-7', [
                  text('adv-proof-3-title', 'Decision confidence', 'text-[20px] font-semibold text-[#171717]', 'h3'),
                  text('adv-proof-3-copy', 'Use case studies and metrics to make the value of senior advice tangible.', 'mt-3 text-[14px] leading-[1.75] text-[#5f574d]'),
                ]),
              ]),
            ]),
            newsletterFooter('adv-footer-newsletter'),
          ]),
        ],
      },
      {
        id: ADVISORY_SERVICES,
        name: 'Services',
        slug: 'services',
        is_index: false,
        page_order: 1,
        settings: seo('Atlas Advisory Services', 'Service architecture page for consulting and executive advisory firms.'),
        layers: [
          body('bg-white text-[#171717] min-h-screen', [
            section('adv-services-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('adv-services-wrap', 'mx-auto flex max-w-6xl flex-col gap-8', [
                text('adv-services-title', 'A service structure built for high-trust decisions.', 'text-[46px] leading-[1] font-semibold tracking-[-0.04em] text-[#171717]', 'h1'),
                box('adv-services-grid', 'grid gap-6 md:grid-cols-2', [
                  box('adv-service-1', 'rounded-[24px] border border-black/10 p-8', [
                    text('adv-service-1-title', 'Growth strategy', 'text-[24px] font-semibold text-[#171717]', 'h3'),
                    text('adv-service-1-copy', 'Market entry, category selection, offer refinement, and decision frameworks for leadership teams.', 'mt-3 text-[15px] leading-[1.8] text-black/62'),
                  ]),
                  box('adv-service-2', 'rounded-[24px] border border-black/10 p-8', [
                    text('adv-service-2-title', 'Transaction readiness', 'text-[24px] font-semibold text-[#171717]', 'h3'),
                    text('adv-service-2-copy', 'Due diligence narrative, investor communications, and operational readiness before major capital events.', 'mt-3 text-[15px] leading-[1.8] text-black/62'),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ],
      },
      {
        id: ADVISORY_CONTACT,
        name: 'Contact',
        slug: 'contact',
        is_index: false,
        page_order: 2,
        settings: seo('Contact Atlas Advisory', 'Contact page for Atlas Advisory discovery calls and executive inquiries.'),
        layers: [
          body('bg-[#f7f3ee] text-[#171717] min-h-screen', [
            section('adv-contact-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('adv-contact-grid', 'mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]', [
                box('adv-contact-copy', 'max-w-md', [
                  text('adv-contact-title', 'Start with a concise brief.', 'text-[42px] leading-[1.04] font-semibold tracking-[-0.04em] text-[#171717]', 'h1'),
                  text('adv-contact-body', 'Use this page for advisory inquiries, board introductions, workshops, or transaction support requests.', 'mt-4 text-[15px] leading-[1.8] text-[#5f574d]'),
                ]),
                box('adv-contact-card', 'rounded-[28px] bg-white p-8', [
                  simpleInput('adv-contact-name', 'text', 'Name'),
                  box('adv-contact-gap-1', 'h-4'),
                  simpleInput('adv-contact-company', 'text', 'Company'),
                  box('adv-contact-gap-2', 'h-4'),
                  simpleInput('adv-contact-email', 'email', 'Email'),
                  box('adv-contact-gap-3', 'h-4'),
                  textarea('adv-contact-message', 'Outline the decision, timeline, and support required'),
                  box('adv-contact-gap-4', 'h-5'),
                  button('adv-contact-submit', 'Request a call', 'rounded-[14px] bg-[#171717] px-[18px] py-[14px] text-[14px] text-white'),
                ]),
              ]),
            ]),
          ]),
        ],
      },
    ],
  },
  {
    id: '9c42ef01-bc61-4d30-9a10-333333333333',
    name: 'Signal OS',
    slug: 'signal-os',
    description: 'A product-led SaaS template with strong hierarchy, trust sections, feature breakdowns, and product contact flow.',
    category: 'SaaS',
    thumbnail_url: 'https://source.unsplash.com/featured/?saas,technology,dashboard',
    preview_url: null,
    tags: ['SaaS', 'Software', 'Startup'],
    is_featured: true,
    sort_order: 3,
    pages: [
      {
        id: SAAS_HOME,
        name: 'Home',
        slug: '',
        is_index: true,
        page_order: 0,
        settings: seo('Signal OS', 'A high-clarity SaaS template for operations products and data platforms.'),
        layers: [
          body('bg-[#07111f] text-white min-h-screen', [
            section('saas-hero', 'px-6 py-16 md:px-10 lg:px-16', [
              box('saas-hero-grid', 'mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center', [
                box('saas-hero-copy', 'max-w-xl', [
                  text('saas-kicker', 'Operational intelligence', 'uppercase tracking-[0.3em] text-[11px] text-white/45', 'span'),
                  text('saas-title', 'Give every operator one clear system for execution, visibility, and handoff.', 'mt-4 text-[58px] leading-[0.95] font-semibold tracking-[-0.05em] text-white', 'h1'),
                  text('saas-copy', 'Signal OS is positioned for B2B software companies that need a serious launch surface without default startup cliches.', 'mt-5 text-[16px] leading-[1.8] text-white/70'),
                  box('saas-buttons', 'mt-8 flex flex-wrap gap-3', [
                    button('saas-features-btn', 'See features', 'rounded-full bg-white px-[18px] py-[12px] text-[14px] text-[#07111f]', SAAS_FEATURES),
                    button('saas-contact-btn', 'Talk to sales', 'rounded-full border border-white/15 px-[18px] py-[12px] text-[14px] text-white', SAAS_CONTACT),
                  ]),
                ]),
                image('saas-hero-image', 'dashboard,blue,software,analytics', 'Product dashboard', 'h-[560px] w-full rounded-[30px] object-cover'),
              ]),
            ]),
            section('saas-grid', 'px-6 py-8 md:px-10 lg:px-16', [
              box('saas-grid-shell', 'mx-auto grid max-w-6xl gap-6 md:grid-cols-3', [
                box('saas-grid-1', 'rounded-[24px] border border-white/10 bg-white/5 p-7', [
                  text('saas-grid-1-title', 'Shared source of truth', 'text-[20px] font-semibold text-white', 'h3'),
                  text('saas-grid-1-copy', 'Combine reporting, workflows, approvals, and escalation in a single product story.', 'mt-3 text-[14px] leading-[1.75] text-white/65'),
                ]),
                box('saas-grid-2', 'rounded-[24px] border border-white/10 bg-white/5 p-7', [
                  text('saas-grid-2-title', 'Calm enterprise tone', 'text-[20px] font-semibold text-white', 'h3'),
                  text('saas-grid-2-copy', 'Useful for infrastructure, operations, analytics, and workflow products that sell to mature teams.', 'mt-3 text-[14px] leading-[1.75] text-white/65'),
                ]),
                box('saas-grid-3', 'rounded-[24px] border border-white/10 bg-white/5 p-7', [
                  text('saas-grid-3-title', 'Demo-ready sections', 'text-[20px] font-semibold text-white', 'h3'),
                  text('saas-grid-3-copy', 'Swap in product screenshots, metric callouts, customer proof, and lifecycle messaging fast.', 'mt-3 text-[14px] leading-[1.75] text-white/65'),
                ]),
              ]),
            ]),
            newsletterFooter('saas-footer-newsletter'),
          ]),
        ],
      },
      {
        id: SAAS_FEATURES,
        name: 'Features',
        slug: 'features',
        is_index: false,
        page_order: 1,
        settings: seo('Signal OS Features', 'Feature architecture page for product-led software teams.'),
        layers: [
          body('bg-white text-[#101828] min-h-screen', [
            section('saas-features-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('saas-features-wrap', 'mx-auto flex max-w-6xl flex-col gap-8', [
                text('saas-features-title', 'Feature groups designed for product clarity, not noise.', 'text-[46px] leading-[1] font-semibold tracking-[-0.04em] text-[#101828]', 'h1'),
                box('saas-features-grid', 'grid gap-6 md:grid-cols-2', [
                  box('saas-feature-1', 'rounded-[24px] border border-black/10 p-8', [
                    text('saas-feature-1-title', 'Workflow orchestration', 'text-[24px] font-semibold text-[#101828]', 'h3'),
                    text('saas-feature-1-copy', 'Tie tasking, approvals, and escalation logic into one clear product narrative.', 'mt-3 text-[15px] leading-[1.8] text-black/62'),
                  ]),
                  box('saas-feature-2', 'rounded-[24px] border border-black/10 p-8', [
                    text('saas-feature-2-title', 'Live operating metrics', 'text-[24px] font-semibold text-[#101828]', 'h3'),
                    text('saas-feature-2-copy', 'Present visibility, forecasting, and alerting as one disciplined outcomes layer.', 'mt-3 text-[15px] leading-[1.8] text-black/62'),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ],
      },
      {
        id: SAAS_CONTACT,
        name: 'Contact',
        slug: 'contact',
        is_index: false,
        page_order: 2,
        settings: seo('Contact Signal OS', 'Sales and product inquiry page for Signal OS.'),
        layers: [
          body('bg-[#f4f7fb] text-[#101828] min-h-screen', [
            section('saas-contact-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('saas-contact-grid', 'mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]', [
                box('saas-contact-copy', 'max-w-md', [
                  text('saas-contact-title', 'Bring your pipeline, process, or platform brief.', 'text-[42px] leading-[1.04] font-semibold tracking-[-0.04em] text-[#101828]', 'h1'),
                  text('saas-contact-body', 'Use the right panel for demos, enterprise qualification, pilot requests, or technical questions.', 'mt-4 text-[15px] leading-[1.8] text-black/62'),
                ]),
                box('saas-contact-card', 'rounded-[28px] bg-white p-8 shadow-[0_16px_60px_rgba(16,24,40,0.08)]', [
                  simpleInput('saas-contact-name', 'text', 'Full name'),
                  box('saas-contact-gap-1', 'h-4'),
                  simpleInput('saas-contact-company', 'text', 'Company'),
                  box('saas-contact-gap-2', 'h-4'),
                  simpleInput('saas-contact-email', 'email', 'Work email'),
                  box('saas-contact-gap-3', 'h-4'),
                  textarea('saas-contact-message', 'What system or workflow are you replacing?'),
                  box('saas-contact-gap-4', 'h-5'),
                  button('saas-contact-submit', 'Request demo', 'rounded-[14px] bg-[#07111f] px-[18px] py-[14px] text-[14px] text-white'),
                ]),
              ]),
            ]),
          ]),
        ],
      },
    ],
  },
  {
    id: '9c42ef01-bc61-4d30-9a10-444444444444',
    name: 'Forma Atelier',
    slug: 'forma-atelier',
    description: 'A refined portfolio template for architecture studios, interior practices, and image-conscious creative offices.',
    category: 'Portfolio',
    thumbnail_url: 'https://source.unsplash.com/featured/?architecture,portfolio,minimal',
    preview_url: null,
    tags: ['Portfolio', 'Architecture', 'Studio'],
    is_featured: true,
    sort_order: 4,
    pages: [
      {
        id: PORTFOLIO_HOME,
        name: 'Home',
        slug: '',
        is_index: true,
        page_order: 0,
        settings: seo('Forma Atelier', 'A portfolio system for architecture and interior design studios.'),
        layers: [
          body('bg-[#f3f0eb] text-[#111] min-h-screen', [
            section('portfolio-hero', 'px-6 py-16 md:px-10 lg:px-16', [
              box('portfolio-hero-wrap', 'mx-auto flex max-w-6xl flex-col gap-8', [
                text('portfolio-kicker', 'Architecture portfolio', 'uppercase tracking-[0.3em] text-[11px] text-black/45', 'span'),
                text('portfolio-title', 'Built to frame spatial work with restraint, precision, and a slower sense of tempo.', 'max-w-4xl text-[62px] leading-[0.95] font-semibold tracking-[-0.05em] text-[#111]', 'h1'),
                image('portfolio-hero-image', 'architecture,minimalist,facade', 'Studio project feature', 'h-[560px] w-full rounded-[30px] object-cover'),
              ]),
            ]),
            section('portfolio-grid', 'px-6 py-8 md:px-10 lg:px-16', [
              box('portfolio-grid-shell', 'mx-auto grid max-w-6xl gap-6 md:grid-cols-2', [
                box('portfolio-card-1', 'flex flex-col gap-4', [
                  image('portfolio-card-1-image', 'interior,concrete,minimalist', 'Interior project', 'h-[420px] w-full rounded-[26px] object-cover'),
                  text('portfolio-card-1-title', 'Residential conversion, Lagos', 'text-[24px] font-semibold tracking-[-0.03em] text-[#111]', 'h3'),
                ]),
                box('portfolio-card-2', 'flex flex-col gap-4', [
                  image('portfolio-card-2-image', 'gallery,light,architectural', 'Gallery project', 'h-[420px] w-full rounded-[26px] object-cover'),
                  text('portfolio-card-2-title', 'Hospitality concept, Lisbon', 'text-[24px] font-semibold tracking-[-0.03em] text-[#111]', 'h3'),
                ]),
              ]),
            ]),
            newsletterFooter('portfolio-footer-newsletter'),
          ]),
        ],
      },
      {
        id: PORTFOLIO_PROJECTS,
        name: 'Projects',
        slug: 'projects',
        is_index: false,
        page_order: 1,
        settings: seo('Forma Atelier Projects', 'Projects page for architecture and design case studies.'),
        layers: [
          body('bg-white text-[#111] min-h-screen', [
            section('portfolio-projects-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('portfolio-projects-wrap', 'mx-auto flex max-w-6xl flex-col gap-8', [
                text('portfolio-projects-title', 'A sequence of projects designed to hold attention through material, scale, and silence.', 'text-[46px] leading-[1] font-semibold tracking-[-0.04em] text-[#111]', 'h1'),
                box('portfolio-projects-list', 'grid gap-6', [
                  box('portfolio-project-entry-1', 'grid gap-5 rounded-[24px] border border-black/10 p-6 md:grid-cols-[0.8fr_1.2fr] md:items-center', [
                    image('portfolio-project-entry-1-image', 'museum,concrete,architecture', 'Museum project', 'h-[240px] w-full rounded-[20px] object-cover'),
                    box('portfolio-project-entry-1-copy', 'max-w-xl', [
                      text('portfolio-project-entry-1-title', 'Civic archive pavilion', 'text-[28px] font-semibold tracking-[-0.03em] text-[#111]', 'h3'),
                      text('portfolio-project-entry-1-body', 'Use this page for project strips, award notes, location context, or narrative captions beneath each case study image.', 'mt-3 text-[15px] leading-[1.8] text-black/62'),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ],
      },
      {
        id: PORTFOLIO_ABOUT,
        name: 'About',
        slug: 'about',
        is_index: false,
        page_order: 2,
        settings: seo('About Forma Atelier', 'Studio profile page for architecture and creative practices.'),
        layers: [
          body('bg-[#f3f0eb] text-[#111] min-h-screen', [
            section('portfolio-about-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('portfolio-about-grid', 'mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center', [
                image('portfolio-about-image', 'architect,studio,materials', 'Studio materials', 'h-[540px] w-full rounded-[28px] object-cover'),
                box('portfolio-about-copy', 'max-w-xl', [
                  text('portfolio-about-kicker', 'Studio profile', 'uppercase tracking-[0.3em] text-[11px] text-black/45', 'span'),
                  text('portfolio-about-title', 'A spatial practice guided by proportion, texture, and client calm.', 'mt-4 text-[46px] leading-[1.02] font-semibold tracking-[-0.05em] text-[#111]', 'h1'),
                  text('portfolio-about-body', 'This page is intentionally image-led and restrained so the studio story feels credible for architecture, interiors, or multidisciplinary practices.', 'mt-5 text-[15px] leading-[1.8] text-black/62'),
                ]),
              ]),
            ]),
          ]),
        ],
      },
    ],
  },
  {
    id: '9c42ef01-bc61-4d30-9a10-555555555555',
    name: 'Meridian Legal',
    slug: 'meridian-legal',
    description: 'A trust-led legal and professional services template with authoritative layout, practice focus, and intake flow.',
    category: 'Agency',
    thumbnail_url: 'https://source.unsplash.com/featured/?law,interior,professional',
    preview_url: null,
    tags: ['Legal', 'Agency', 'Professional Services'],
    is_featured: true,
    sort_order: 5,
    pages: [
      {
        id: LEGAL_HOME,
        name: 'Home',
        slug: '',
        is_index: true,
        page_order: 0,
        settings: seo('Meridian Legal', 'A composed legal site template for firms that need authority and clarity.'),
        layers: [
          body('bg-[#f9f6f1] text-[#161616] min-h-screen', [
            section('legal-hero', 'px-6 py-16 md:px-10 lg:px-16', [
              box('legal-hero-grid', 'mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center', [
                box('legal-hero-copy', 'max-w-xl', [
                  text('legal-kicker', 'Professional legal counsel', 'uppercase tracking-[0.3em] text-[11px] text-[#8c7f70]', 'span'),
                  text('legal-title', 'Measured counsel for complex commercial, regulatory, and dispute matters.', 'mt-4 text-[58px] leading-[0.96] font-semibold tracking-[-0.05em] text-[#161616]', 'h1'),
                  text('legal-copy', 'Meridian Legal is structured for firms that need to sound calm, credible, and exacting. Use it for litigation, business law, compliance, or specialist advisory work.', 'mt-5 text-[16px] leading-[1.8] text-[#5f564b]'),
                  box('legal-buttons', 'mt-8 flex flex-wrap gap-3', [
                    button('legal-practice-btn', 'Practice areas', 'rounded-full bg-[#161616] px-[18px] py-[12px] text-[14px] text-white', LEGAL_PRACTICE),
                    button('legal-contact-btn', 'Request consultation', 'rounded-full border border-[#161616]/10 px-[18px] py-[12px] text-[14px] text-[#161616]', LEGAL_CONTACT),
                  ]),
                ]),
                image('legal-hero-image', 'law-office,interior,books', 'Law office library', 'h-[560px] w-full rounded-[30px] object-cover'),
              ]),
            ]),
            section('legal-proof', 'px-6 py-8 md:px-10 lg:px-16', [
              box('legal-proof-shell', 'mx-auto grid max-w-6xl gap-6 md:grid-cols-3', [
                box('legal-proof-1', 'rounded-[24px] bg-white p-7', [
                  text('legal-proof-1-title', 'Authoritative positioning', 'text-[20px] font-semibold text-[#161616]', 'h3'),
                  text('legal-proof-1-copy', 'Speak to risk, diligence, and practical judgment without relying on heavy-handed visuals.', 'mt-3 text-[14px] leading-[1.75] text-[#5f564b]'),
                ]),
                box('legal-proof-2', 'rounded-[24px] bg-white p-7', [
                  text('legal-proof-2-title', 'Practice architecture', 'text-[20px] font-semibold text-[#161616]', 'h3'),
                  text('legal-proof-2-copy', 'Map expertise areas clearly for corporate, regulatory, or dispute-oriented mandates.', 'mt-3 text-[14px] leading-[1.75] text-[#5f564b]'),
                ]),
                box('legal-proof-3', 'rounded-[24px] bg-white p-7', [
                  text('legal-proof-3-title', 'Intake clarity', 'text-[20px] font-semibold text-[#161616]', 'h3'),
                  text('legal-proof-3-copy', 'Give prospective clients a concise, high-trust path into consultation or evaluation.', 'mt-3 text-[14px] leading-[1.75] text-[#5f564b]'),
                ]),
              ]),
            ]),
            newsletterFooter('legal-footer-newsletter'),
          ]),
        ],
      },
      {
        id: LEGAL_PRACTICE,
        name: 'Practice Areas',
        slug: 'practice-areas',
        is_index: false,
        page_order: 1,
        settings: seo('Meridian Legal Practice Areas', 'Practice area page for legal and specialist professional service firms.'),
        layers: [
          body('bg-white text-[#161616] min-h-screen', [
            section('legal-practice-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('legal-practice-wrap', 'mx-auto flex max-w-6xl flex-col gap-8', [
                text('legal-practice-title', 'Practice areas presented with the same discipline clients expect in the work itself.', 'text-[46px] leading-[1] font-semibold tracking-[-0.04em] text-[#161616]', 'h1'),
                box('legal-practice-grid', 'grid gap-6 md:grid-cols-2', [
                  box('legal-practice-1', 'rounded-[24px] border border-black/10 p-8', [
                    text('legal-practice-1-title', 'Commercial advisory', 'text-[24px] font-semibold text-[#161616]', 'h3'),
                    text('legal-practice-1-copy', 'Contract strategy, transactions, negotiation support, and complex business structuring.', 'mt-3 text-[15px] leading-[1.8] text-black/62'),
                  ]),
                  box('legal-practice-2', 'rounded-[24px] border border-black/10 p-8', [
                    text('legal-practice-2-title', 'Regulatory and risk', 'text-[24px] font-semibold text-[#161616]', 'h3'),
                    text('legal-practice-2-copy', 'Compliance architecture, regulatory responses, investigations, and policy review.', 'mt-3 text-[15px] leading-[1.8] text-black/62'),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ],
      },
      {
        id: LEGAL_CONTACT,
        name: 'Contact',
        slug: 'contact',
        is_index: false,
        page_order: 2,
        settings: seo('Contact Meridian Legal', 'Consultation request page for Meridian Legal.'),
        layers: [
          body('bg-[#f9f6f1] text-[#161616] min-h-screen', [
            section('legal-contact-shell', 'px-6 py-16 md:px-10 lg:px-16', [
              box('legal-contact-grid', 'mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]', [
                box('legal-contact-copy', 'max-w-md', [
                  text('legal-contact-title', 'Request an initial consultation.', 'text-[42px] leading-[1.04] font-semibold tracking-[-0.04em] text-[#161616]', 'h1'),
                  text('legal-contact-body', 'Use this form for dispute intake, corporate matters, regulatory questions, or specialist mandates.', 'mt-4 text-[15px] leading-[1.8] text-[#5f564b]'),
                ]),
                box('legal-contact-card', 'rounded-[28px] bg-white p-8', [
                  simpleInput('legal-contact-name', 'text', 'Name'),
                  box('legal-contact-gap-1', 'h-4'),
                  simpleInput('legal-contact-company', 'text', 'Organization'),
                  box('legal-contact-gap-2', 'h-4'),
                  simpleInput('legal-contact-email', 'email', 'Email'),
                  box('legal-contact-gap-3', 'h-4'),
                  textarea('legal-contact-message', 'Briefly describe the matter and urgency'),
                  box('legal-contact-gap-4', 'h-5'),
                  button('legal-contact-submit', 'Submit request', 'rounded-[14px] bg-[#161616] px-[18px] py-[14px] text-[14px] text-white'),
                ]),
              ]),
            ]),
          ]),
        ],
      },
    ],
  },
];

export const professionalLibraryPack: ProfessionalBuilderTemplateSeed[] = [
  {
    key: 'xxiv-blog-hero-monochrome',
    name: 'Blog Hero Monochrome',
    type: 'layout',
    category: 'Editorial',
    source: 'internal',
    tags: ['blog', 'hero', 'monochrome'],
    sort_order: 200,
    template: {
      name: 'section',
      classes: 'px-[24px] py-[72px] bg-white',
      children: [
        {
          name: 'div',
          classes: 'mx-auto grid max-w-[1200px] gap-[40px] lg:grid-cols-[1.1fr_0.9fr] lg:items-center',
          children: [
            {
              name: 'div',
              classes: 'max-w-[680px]',
              children: [
                { name: 'text', settings: { tag: 'span' }, classes: 'uppercase tracking-[0.32em] text-[11px] text-black/45', variables: { text: dtext('Featured Essay') } },
                { name: 'text', settings: { tag: 'h1' }, classes: 'mt-[20px] text-[56px] leading-[0.94] font-[600] tracking-[-0.05em] text-black', variables: { text: dtext('A refined editorial hero block for modern publishing teams.') } },
                { name: 'text', settings: { tag: 'p' }, classes: 'mt-[20px] text-[16px] leading-[1.8] text-black/68', variables: { text: dtext('Drop this section into a blog homepage, issue landing page, or feature article hub.') } },
              ],
            },
            {
              name: 'image',
              classes: 'h-[520px] w-full rounded-[28px] object-cover',
              variables: {
                image: {
                  src: dtext('https://source.unsplash.com/featured/?minimalist,architecture,black-and-white'),
                  alt: dtext('Editorial hero image'),
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    key: 'xxiv-blog-post-card-grid',
    name: 'Blog Post Card Grid',
    type: 'layout',
    category: 'Editorial',
    source: 'internal',
    tags: ['blog', 'grid', 'cards'],
    sort_order: 201,
    template: {
      name: 'section',
      classes: 'px-[24px] py-[48px] bg-white',
      children: [
        {
          name: 'div',
          classes: 'mx-auto grid max-w-[1200px] gap-[24px] md:grid-cols-2 xl:grid-cols-3',
          children: [
            {
              name: 'div',
              classes: 'overflow-hidden rounded-[24px] border border-black/10 bg-white',
              children: [
                {
                  name: 'image',
                  classes: 'h-[240px] w-full object-cover',
                  variables: {
                    image: {
                      src: dtext('https://source.unsplash.com/featured/?minimalist,interior,shadow'),
                      alt: dtext('Post thumbnail'),
                    },
                  },
                },
                {
                  name: 'div',
                  classes: 'flex flex-col gap-[14px] p-[24px]',
                  children: [
                    { name: 'text', settings: { tag: 'span' }, classes: 'text-[11px] uppercase tracking-[0.24em] text-black/45', variables: { text: dtext('Perspective') } },
                    { name: 'text', settings: { tag: 'h3' }, classes: 'text-[24px] leading-[1.2] font-[600] tracking-[-0.03em] text-black', variables: { text: dtext('A reusable article card with strong editorial hierarchy.') } },
                    { name: 'text', settings: { tag: 'p' }, classes: 'text-[15px] leading-[1.75] text-black/62', variables: { text: dtext('Use it in homepages, issue pages, or category archives.') } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'xxiv-consulting-proof-trio',
    name: 'Consulting Proof Trio',
    type: 'layout',
    category: 'Business',
    source: 'internal',
    tags: ['consulting', 'proof', 'services'],
    sort_order: 202,
    template: {
      name: 'section',
      classes: 'px-[24px] py-[56px] bg-[#f7f3ee]',
      children: [
        {
          name: 'div',
          classes: 'mx-auto grid max-w-[1200px] gap-[24px] md:grid-cols-3',
          children: [
            {
              name: 'div',
              classes: 'rounded-[24px] bg-white p-[28px]',
              children: [
                { name: 'text', settings: { tag: 'h3' }, classes: 'text-[20px] font-[600] text-[#171717]', variables: { text: dtext('Executive positioning') } },
                { name: 'text', settings: { tag: 'p' }, classes: 'mt-[12px] text-[14px] leading-[1.75] text-black/60', variables: { text: dtext('Clarify what you solve, who you serve, and why that advice matters.') } },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'xxiv-saas-feature-split',
    name: 'SaaS Feature Split',
    type: 'layout',
    category: 'SaaS',
    source: 'internal',
    tags: ['saas', 'feature', 'product'],
    sort_order: 203,
    template: {
      name: 'section',
      classes: 'px-[24px] py-[72px] bg-white',
      children: [
        {
          name: 'div',
          classes: 'mx-auto grid max-w-[1200px] gap-[40px] lg:grid-cols-2 lg:items-center',
          children: [
            {
              name: 'div',
              classes: 'max-w-[560px]',
              children: [
                { name: 'text', settings: { tag: 'span' }, classes: 'uppercase tracking-[0.3em] text-[11px] text-black/45', variables: { text: dtext('Feature group') } },
                { name: 'text', settings: { tag: 'h2' }, classes: 'mt-[16px] text-[46px] leading-[1] font-[600] tracking-[-0.04em] text-[#101828]', variables: { text: dtext('Give product capabilities a cleaner narrative frame.') } },
                { name: 'text', settings: { tag: 'p' }, classes: 'mt-[16px] text-[15px] leading-[1.8] text-black/62', variables: { text: dtext('Use this split block for workflow, analytics, automation, or platform claims.') } },
              ],
            },
            {
              name: 'image',
              classes: 'h-[420px] w-full rounded-[28px] object-cover',
              variables: {
                image: {
                  src: dtext('https://source.unsplash.com/featured/?dashboard,software,analytics'),
                  alt: dtext('Feature visual'),
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    key: 'xxiv-portfolio-project-strip',
    name: 'Portfolio Project Strip',
    type: 'layout',
    category: 'Portfolio',
    source: 'internal',
    tags: ['portfolio', 'project', 'architecture'],
    sort_order: 204,
    template: {
      name: 'section',
      classes: 'px-[24px] py-[48px] bg-white',
      children: [
        {
          name: 'div',
          classes: 'mx-auto grid max-w-[1200px] gap-[20px] rounded-[24px] border border-black/10 p-[24px] md:grid-cols-[0.85fr_1.15fr] md:items-center',
          children: [
            {
              name: 'image',
              classes: 'h-[260px] w-full rounded-[20px] object-cover',
              variables: {
                image: {
                  src: dtext('https://source.unsplash.com/featured/?museum,concrete,architecture'),
                  alt: dtext('Project image'),
                },
              },
            },
            {
              name: 'div',
              classes: 'max-w-[560px]',
              children: [
                { name: 'text', settings: { tag: 'h3' }, classes: 'text-[28px] font-[600] tracking-[-0.03em] text-[#111]', variables: { text: dtext('Project strip for case-study led portfolios.') } },
                { name: 'text', settings: { tag: 'p' }, classes: 'mt-[12px] text-[15px] leading-[1.8] text-black/62', variables: { text: dtext('Pair one strong image with location, typology, and an excerpt-sized narrative.') } },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'xxiv-professional-contact-form',
    name: 'Professional Contact Form',
    type: 'layout',
    category: 'Contact',
    source: 'internal',
    tags: ['contact', 'form', 'business'],
    sort_order: 205,
    template: {
      name: 'section',
      classes: 'px-[24px] py-[72px] bg-[#f8f8f8]',
      children: [
        {
          name: 'div',
          classes: 'mx-auto grid max-w-[1200px] gap-[32px] lg:grid-cols-[0.8fr_1.2fr]',
          children: [
            {
              name: 'div',
              classes: 'max-w-[440px]',
              children: [
                { name: 'text', settings: { tag: 'h2' }, classes: 'text-[42px] leading-[1.04] font-[600] tracking-[-0.04em] text-black', variables: { text: dtext('A clean inquiry form for serious service businesses.') } },
                { name: 'text', settings: { tag: 'p' }, classes: 'mt-[14px] text-[15px] leading-[1.8] text-black/62', variables: { text: dtext('Use it for consultations, demos, editorial inquiries, or studio briefs.') } },
              ],
            },
            {
              name: 'div',
              classes: 'rounded-[28px] bg-white p-[32px]',
              children: [
                { name: 'input', classes: 'w-full rounded-[14px] border border-black/10 bg-white px-[16px] py-[14px] text-[14px] text-black', attributes: { type: 'text', placeholder: 'Name' } },
                { name: 'div', classes: 'h-[16px]' },
                { name: 'input', classes: 'w-full rounded-[14px] border border-black/10 bg-white px-[16px] py-[14px] text-[14px] text-black', attributes: { type: 'email', placeholder: 'Email' } },
                { name: 'div', classes: 'h-[16px]' },
                { name: 'textarea', classes: 'min-h-[160px] w-full rounded-[14px] border border-black/10 bg-white px-[16px] py-[14px] text-[14px] text-black', attributes: { placeholder: 'Tell us what you need' } },
                { name: 'div', classes: 'h-[20px]' },
                { name: 'button', classes: 'rounded-[14px] bg-black px-[18px] py-[14px] text-[14px] text-white', variables: { text: dtext('Send request') } },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'xxiv-footer-newsletter-bar',
    name: 'Footer Newsletter Bar',
    type: 'layout',
    category: 'Footer',
    source: 'internal',
    tags: ['footer', 'newsletter', 'subscription'],
    sort_order: 206,
    template: {
      name: 'section',
      classes: 'border-t border-black/10 px-[24px] py-[64px] bg-white',
      children: [
        {
          name: 'div',
          classes: 'mx-auto flex max-w-[1200px] flex-col gap-[24px] lg:flex-row lg:items-end lg:justify-between',
          children: [
            {
              name: 'div',
              classes: 'max-w-[640px]',
              children: [
                { name: 'text', settings: { tag: 'span' }, classes: 'uppercase tracking-[0.28em] text-[11px] text-black/45', variables: { text: dtext('Newsletter subscription') } },
                { name: 'text', settings: { tag: 'h2' }, classes: 'mt-[12px] text-[32px] leading-[1.05] font-[600] tracking-[-0.04em] text-black', variables: { text: dtext('A reusable footer block for thoughtful updates and issue drops.') } },
              ],
            },
            {
              name: 'div',
              classes: 'flex w-full max-w-[520px] flex-col gap-[12px] sm:flex-row',
              children: [
                { name: 'input', classes: 'w-full rounded-[14px] border border-black/10 bg-white px-[16px] py-[14px] text-[14px] text-black', attributes: { type: 'email', placeholder: 'Email address' } },
                { name: 'button', classes: 'rounded-[14px] bg-black px-[18px] py-[14px] text-[14px] text-white', variables: { text: dtext('Subscribe') } },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'xxiv-auth-signout-element',
    name: 'Sign Out Element',
    type: 'element',
    category: 'Authentication',
    source: 'internal',
    tags: ['auth', 'logout', 'site'],
    sort_order: 207,
    template: {
      name: 'button',
      customName: 'Sign out element',
      classes: 'rounded-[12px] bg-black px-[18px] py-[12px] text-white',
      settings: { customAttributes: { 'data-xxiv-auth': 'logout' } },
      variables: { text: dtext('Sign out') },
    },
  },
];
