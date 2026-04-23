import type { LayerTemplate } from '@/types';
import { getTiptapTextContent } from '@/lib/text-format-utils';

export interface BuilderTemplateSeed {
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

function richText(content: string) {
  return {
    type: 'dynamic_rich_text' as const,
    data: {
      content: getTiptapTextContent(content),
    },
  };
}

function textLayer(
  content: string,
  classes: string,
  tag: string = 'p',
  design: LayerTemplate['design'] = {},
): LayerTemplate {
  return {
    name: 'text',
    settings: { tag },
    classes,
    restrictions: { editText: true },
    design,
    variables: {
      text: richText(content),
    },
  };
}

function headingLayer(
  content: string,
  tag: 'h1' | 'h2' | 'h3' = 'h2',
  classes: string = 'text-[48px] font-[700] leading-[1.05] tracking-[-0.03em] text-[#171717]',
): LayerTemplate {
  return {
    name: 'heading',
    settings: { tag },
    classes,
    restrictions: { editText: true },
    design: {
      typography: {
        isActive: true,
        fontWeight: '700',
        lineHeight: '1.05',
        letterSpacing: '-0.03',
        color: '#171717',
      },
    },
    variables: {
      text: richText(content),
    },
  };
}

function buttonLayer(content: string, dark: boolean = true): LayerTemplate {
  return {
    name: 'button',
    classes: dark
      ? 'inline-flex items-center justify-center h-[44px] px-[18px] rounded-[999px] bg-[#171717] text-[#ffffff] text-[14px] font-[500]'
      : 'inline-flex items-center justify-center h-[44px] px-[18px] rounded-[999px] bg-[#f5f5f5] text-[#171717] text-[14px] font-[500]',
    attributes: {
      type: 'button',
    },
    design: {
      layout: {
        isActive: true,
        display: 'Flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      sizing: {
        isActive: true,
        height: '44px',
      },
      spacing: {
        isActive: true,
        paddingLeft: '18px',
        paddingRight: '18px',
      },
      borders: {
        isActive: true,
        borderRadius: '999px',
      },
      typography: {
        isActive: true,
        fontSize: '14px',
        fontWeight: '500',
        color: dark ? '#ffffff' : '#171717',
      },
      backgrounds: {
        isActive: true,
        backgroundColor: dark ? '#171717' : '#f5f5f5',
      },
    },
    children: [
      {
        name: 'text',
        settings: { tag: 'span' },
        classes: '',
        restrictions: { editText: true },
        variables: {
          text: richText(content),
        },
      },
    ],
  };
}

function imageLayer(src: string, alt: string, classes: string): LayerTemplate {
  return {
    name: 'image',
    settings: {
      tag: 'img',
    },
    classes,
    attributes: {
      loading: 'lazy',
    },
    design: {
      sizing: {
        isActive: true,
        width: '100%',
      },
    },
    variables: {
      image: {
        src: {
          type: 'dynamic_text',
          data: {
            content: src,
          },
        },
        alt: {
          type: 'dynamic_text',
          data: {
            content: alt,
          },
        },
      },
    },
  };
}

function container(children: LayerTemplate[], classes: string = 'flex flex-col w-full max-w-[1120px] px-[24px] md:px-[32px]'): LayerTemplate {
  return {
    name: 'div',
    customName: 'Container',
    classes,
    design: {
      layout: {
        isActive: true,
        display: 'Flex',
        flexDirection: 'column',
      },
      sizing: {
        isActive: true,
        width: '100%',
        maxWidth: '1120px',
      },
      spacing: {
        isActive: true,
        paddingLeft: '24px',
        paddingRight: '24px',
      },
    },
    children,
  };
}

function section(children: LayerTemplate[], classes: string = 'flex flex-col items-center w-full py-[96px] bg-[#ffffff]'): LayerTemplate {
  return {
    name: 'section',
    customName: 'Section',
    classes,
    design: {
      layout: {
        isActive: true,
        display: 'Flex',
        flexDirection: 'column',
        alignItems: 'center',
      },
      sizing: {
        isActive: true,
        width: '100%',
      },
      spacing: {
        isActive: true,
        paddingTop: '96px',
        paddingBottom: '96px',
      },
      backgrounds: {
        isActive: true,
        backgroundColor: '#ffffff',
      },
    },
    children,
  };
}

function logoChip(label: string): LayerTemplate {
  return {
    name: 'div',
    customName: 'Logo chip',
    classes: 'inline-flex items-center justify-center px-[16px] py-[10px] rounded-[999px] border border-[#171717]/10 bg-[#ffffff]',
    design: {
      layout: {
        isActive: true,
        display: 'Flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      spacing: {
        isActive: true,
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '10px',
        paddingBottom: '10px',
      },
      borders: {
        isActive: true,
        borderWidth: '1px',
        borderColor: 'rgba(23, 23, 23, 0.1)',
        borderRadius: '999px',
      },
      backgrounds: {
        isActive: true,
        backgroundColor: '#ffffff',
      },
    },
    children: [
      textLayer(label, 'text-[13px] uppercase tracking-[0.08em] text-[#737373]', 'span', {
        typography: {
          isActive: true,
          fontSize: '13px',
          color: '#737373',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
      }),
    ],
  };
}

function caseStudyCard(stat: string, title: string, body: string): LayerTemplate {
  return {
    name: 'div',
    customName: 'Case story card',
    classes: 'flex flex-col gap-[18px] h-full p-[28px] rounded-[24px] border border-[#171717]/10 bg-[#ffffff]',
    design: {
      layout: {
        isActive: true,
        display: 'Flex',
        flexDirection: 'column',
        gap: '18px',
      },
      spacing: {
        isActive: true,
        padding: '28px',
      },
      borders: {
        isActive: true,
        borderWidth: '1px',
        borderColor: 'rgba(23, 23, 23, 0.1)',
        borderRadius: '24px',
      },
      backgrounds: {
        isActive: true,
        backgroundColor: '#ffffff',
      },
    },
    children: [
      textLayer(stat, 'text-[44px] font-[700] leading-[1] text-[#171717]', 'p', {
        typography: { isActive: true, fontSize: '44px', fontWeight: '700', lineHeight: '1', color: '#171717' },
      }),
      headingLayer(title, 'h3', 'text-[22px] font-[600] leading-[1.2] text-[#171717]'),
      textLayer(body, 'text-[15px] leading-[1.6] text-[#737373]', 'p', {
        typography: { isActive: true, fontSize: '15px', lineHeight: '1.6', color: '#737373' },
      }),
      textLayer('Case study', 'text-[14px] font-[500] text-[#171717]', 'span', {
        typography: { isActive: true, fontSize: '14px', fontWeight: '500', color: '#171717' },
      }),
    ],
  };
}

function statItem(value: string, label: string): LayerTemplate {
  return {
    name: 'div',
    customName: 'Stat item',
    classes: 'flex flex-col items-center text-center gap-[8px]',
    design: {
      layout: {
        isActive: true,
        display: 'Flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      },
    },
    children: [
      textLayer(value, 'text-[36px] font-[700] leading-[1] text-[#171717]', 'p', {
        typography: { isActive: true, fontSize: '36px', fontWeight: '700', lineHeight: '1', color: '#171717' },
      }),
      textLayer(label, 'text-[14px] text-[#737373]', 'p', {
        typography: { isActive: true, fontSize: '14px', color: '#737373' },
      }),
    ],
  };
}

function timelineStep(index: string, body: string): LayerTemplate {
  return {
    name: 'div',
    customName: 'Timeline step',
    classes: 'flex items-start gap-[16px]',
    design: {
      layout: {
        isActive: true,
        display: 'Flex',
        alignItems: 'start',
        gap: '16px',
      },
    },
    children: [
      {
        name: 'div',
        classes: 'size-[32px] shrink-0 rounded-full border border-[#171717]/15 flex items-center justify-center',
        design: {
          sizing: { isActive: true, width: '32px', height: '32px' },
          layout: { isActive: true, display: 'Flex', alignItems: 'center', justifyContent: 'center' },
          borders: { isActive: true, borderWidth: '1px', borderColor: 'rgba(23, 23, 23, 0.15)', borderRadius: '999px' },
        },
        children: [
          textLayer(index, 'text-[12px] font-[700] text-[#171717]', 'span', {
            typography: { isActive: true, fontSize: '12px', fontWeight: '700', color: '#171717' },
          }),
        ],
      },
      textLayer(body, 'text-[15px] leading-[1.6] text-[#737373]', 'p', {
        typography: { isActive: true, fontSize: '15px', lineHeight: '1.6', color: '#737373' },
      }),
    ],
  };
}

function contactField(type: 'text' | 'email', placeholder: string): LayerTemplate {
  return {
    name: 'input',
    classes: 'w-full h-[54px] px-[16px] rounded-[16px] bg-[#f5f5f5] text-[14px] text-[#171717]',
    attributes: { type, placeholder },
    design: {
      sizing: { isActive: true, width: '100%', height: '54px' },
      spacing: { isActive: true, paddingLeft: '16px', paddingRight: '16px' },
      borders: { isActive: true, borderRadius: '16px' },
      backgrounds: { isActive: true, backgroundColor: '#f5f5f5' },
      typography: { isActive: true, fontSize: '14px', color: '#171717' },
    },
  };
}

function contactInfoItem(title: string, body: string): LayerTemplate {
  return {
    name: 'div',
    customName: 'Contact info item',
    classes: 'flex flex-col gap-[6px]',
    design: {
      layout: {
        isActive: true,
        display: 'Flex',
        flexDirection: 'column',
        gap: '6px',
      },
    },
    children: [
      textLayer(title, 'text-[16px] font-[600] text-[#171717]', 'p', {
        typography: { isActive: true, fontSize: '16px', fontWeight: '600', color: '#171717' },
      }),
      textLayer(body, 'text-[14px] leading-[1.6] text-[#737373]', 'p', {
        typography: { isActive: true, fontSize: '14px', lineHeight: '1.6', color: '#737373' },
      }),
    ],
  };
}

export const builderTemplateSeeds: BuilderTemplateSeed[] = [
  {
    key: 'agency-nav-links',
    name: 'Agency Nav Links',
    type: 'element',
    category: 'Marketing',
    source: 'preline',
    sort_order: 10,
    template: {
      name: 'div',
      customName: 'Nav links',
      classes: 'flex items-center gap-[20px] flex-wrap',
      design: { layout: { isActive: true, display: 'Flex', alignItems: 'center', gap: '20px' } },
      children: [
        textLayer('Home', 'text-[14px] text-[#404040]', 'a'),
        textLayer('Company', 'text-[14px] text-[#404040]', 'a'),
        textLayer('Stories', 'text-[14px] text-[#404040]', 'a'),
        textLayer('Product', 'text-[14px] text-[#404040]', 'a'),
      ],
    },
  },
  {
    key: 'agency-logo-chip',
    name: 'Agency Logo Chip',
    type: 'element',
    category: 'Marketing',
    source: 'preline',
    sort_order: 20,
    template: logoChip('Open Source'),
  },
  {
    key: 'agency-stat-card',
    name: 'Agency Stat Card',
    type: 'element',
    category: 'Marketing',
    source: 'preline',
    sort_order: 30,
    template: {
      name: 'div',
      customName: 'Card',
      classes: 'flex flex-col gap-[20px] h-full p-[24px] rounded-[20px] border border-[#171717]/10 bg-[#ffffff]',
      design: {
        layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '20px' },
        spacing: { isActive: true, padding: '24px' },
        borders: { isActive: true, borderWidth: '1px', borderColor: 'rgba(23, 23, 23, 0.1)', borderRadius: '20px' },
        backgrounds: { isActive: true, backgroundColor: '#ffffff' },
      },
      children: [
        textLayer('2,000+', 'text-[36px] font-[700] leading-[1] text-[#171717]', 'p', {
          typography: { isActive: true, fontSize: '36px', fontWeight: '700', lineHeight: '1', color: '#171717' },
        }),
        textLayer('Preline partners', 'text-[14px] text-[#737373]', 'p', {
          typography: { isActive: true, fontSize: '14px', color: '#737373' },
        }),
      ],
    },
  },
  {
    key: 'agency-case-study-card',
    name: 'Agency Case Study Card',
    type: 'element',
    category: 'Marketing',
    source: 'preline',
    sort_order: 40,
    template: caseStudyCard('43%', 'Enhancement in Customer Engagement', 'A focused retention strategy improved brand loyalty and unlocked stronger customer engagement across the funnel.'),
  },
  {
    key: 'agency-testimonial-quote',
    name: 'Agency Testimonial Quote',
    type: 'element',
    category: 'Marketing',
    source: 'preline',
    sort_order: 50,
    template: {
      name: 'div',
      customName: 'Testimonial quote',
      classes: 'flex flex-col gap-[20px]',
      design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '20px' } },
      children: [
        textLayer('To say that switching to Preline has been life-changing is an understatement. My business has tripled since then.', 'text-[24px] leading-[1.45] text-[#171717]', 'blockquote', {
          typography: { isActive: true, fontSize: '24px', lineHeight: '1.45', color: '#171717' },
        }),
        {
          name: 'div',
          classes: 'flex flex-col gap-[4px]',
          design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '4px' } },
          children: [
            textLayer('Nicole Grazioso', 'text-[16px] font-[600] text-[#171717]', 'p', {
              typography: { isActive: true, fontSize: '16px', fontWeight: '600', color: '#171717' },
            }),
            textLayer('Director Payments & Risk | Airbnb', 'text-[13px] text-[#737373]', 'p', {
              typography: { isActive: true, fontSize: '13px', color: '#737373' },
            }),
          ],
        },
      ],
    },
  },
  {
    key: 'agency-timeline-step',
    name: 'Agency Timeline Step',
    type: 'element',
    category: 'Marketing',
    source: 'preline',
    sort_order: 60,
    template: timelineStep('1', 'Market Research and Analysis: Identify your target audience and understand their needs, preferences, and behaviors.'),
  },
  {
    key: 'agency-contact-item',
    name: 'Agency Contact Item',
    type: 'element',
    category: 'Marketing',
    source: 'preline',
    sort_order: 70,
    template: contactInfoItem('Our address:', '300 Bath Street, Tay House, Glasgow G2 4JR, United Kingdom'),
  },
  {
    key: 'agency-contact-form',
    name: 'Agency Contact Form',
    type: 'element',
    category: 'Marketing',
    source: 'preline',
    sort_order: 80,
    template: {
      name: 'form',
      customName: 'Agency contact form',
      classes: 'flex flex-col gap-[14px] w-full',
      design: {
        sizing: { isActive: true, width: '100%' },
        layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '14px' },
      },
      children: [
        contactField('text', 'Name'),
        contactField('email', 'Email'),
        {
          name: 'textarea',
          classes: 'w-full min-h-[140px] px-[16px] py-[14px] rounded-[16px] bg-[#f5f5f5] text-[14px] text-[#171717]',
          attributes: { placeholder: 'Tell us about your project', rows: 5 },
          design: {
            sizing: { isActive: true, width: '100%', minHeight: '140px' },
            spacing: { isActive: true, paddingLeft: '16px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' },
            borders: { isActive: true, borderRadius: '16px' },
            backgrounds: { isActive: true, backgroundColor: '#f5f5f5' },
            typography: { isActive: true, fontSize: '14px', color: '#171717' },
          },
        },
        buttonLayer('Submit'),
      ],
    },
  },
  {
    key: 'agency-header-001',
    name: 'Agency Header',
    type: 'layout',
    category: 'Header',
    source: 'preline',
    sort_order: 100,
    template: {
      name: 'section',
      customName: 'Agency header',
      classes: 'flex flex-col items-center w-full pt-[24px] pb-[12px] bg-[#ffffff]',
      design: {
        layout: { isActive: true, display: 'Flex', flexDirection: 'column', alignItems: 'center' },
        sizing: { isActive: true, width: '100%' },
        spacing: { isActive: true, paddingTop: '24px', paddingBottom: '12px' },
        backgrounds: { isActive: true, backgroundColor: '#ffffff' },
      },
      children: [
        container([
          {
            name: 'div',
            customName: 'Header shell',
            classes: 'flex flex-col md:flex-row md:items-center md:justify-between gap-[20px] w-full px-[20px] py-[14px] rounded-[28px] border border-[#171717]/10 bg-[#ffffff]',
            design: {
              layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '20px', justifyContent: 'space-between' },
              spacing: { isActive: true, paddingLeft: '20px', paddingRight: '20px', paddingTop: '14px', paddingBottom: '14px' },
              borders: { isActive: true, borderWidth: '1px', borderColor: 'rgba(23, 23, 23, 0.1)', borderRadius: '28px' },
              backgrounds: { isActive: true, backgroundColor: '#ffffff' },
            },
            children: [
              textLayer('Preline', 'text-[22px] font-[700] tracking-[-0.03em] text-[#171717]', 'p', {
                typography: { isActive: true, fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em', color: '#171717' },
              }),
              {
                name: 'div',
                classes: 'flex items-center flex-wrap gap-[16px]',
                design: { layout: { isActive: true, display: 'Flex', alignItems: 'center', gap: '16px' } },
                children: [
                  textLayer('Home', 'text-[14px] text-[#525252]', 'a'),
                  textLayer('Company', 'text-[14px] text-[#525252]', 'a'),
                  textLayer('Stories', 'text-[14px] text-[#525252]', 'a'),
                  textLayer('Product', 'text-[14px] text-[#525252]', 'a'),
                ],
              },
              buttonLayer('Request demo'),
            ],
          },
        ]),
      ],
    },
  },
  {
    key: 'agency-hero-001',
    name: 'Agency Hero',
    type: 'layout',
    category: 'Hero',
    source: 'preline',
    sort_order: 110,
    template: section([
      container([
        {
          name: 'div',
          classes: 'flex flex-col gap-[20px] max-w-[860px]',
          design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '20px' }, sizing: { isActive: true, maxWidth: '860px' } },
          children: [
            headingLayer('Preline Agency: Transforming ideas into reality', 'h1'),
            textLayer('It is a creative hub where imagination meets craftsmanship to transform ideas into tangible realities. At Preline Agency, we specialize in turning conceptual visions into concrete forms through design, strategy, and digital product execution.', 'text-[18px] leading-[1.7] text-[#737373]', 'p', {
              typography: { isActive: true, fontSize: '18px', lineHeight: '1.7', color: '#737373' },
            }),
            {
              name: 'div',
              classes: 'flex flex-wrap gap-[12px]',
              design: { layout: { isActive: true, display: 'Flex', gap: '12px' } },
              children: [buttonLayer('Request demo'), buttonLayer('View stories', false)],
            },
          ],
        },
      ]),
    ]),
  },
  {
    key: 'agency-logos-001',
    name: 'Agency Logos',
    type: 'layout',
    category: 'Features',
    source: 'preline',
    sort_order: 120,
    template: section([
      container([
        {
          name: 'div',
          classes: 'flex flex-col gap-[24px]',
          design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '24px' } },
          children: [
            textLayer('Trusted by Open Source, enterprise, and more than 99,000 teams', 'text-[15px] text-[#737373]', 'p', {
              typography: { isActive: true, fontSize: '15px', color: '#737373' },
            }),
            {
              name: 'div',
              classes: 'flex flex-wrap gap-[12px]',
              design: { layout: { isActive: true, display: 'Flex', gap: '12px', flexWrap: 'wrap' } },
              children: [logoChip('Open Source'), logoChip('Node'), logoChip('Vercel'), logoChip('Slack'), logoChip('GitLab'), logoChip('Airbnb')],
            },
          ],
        },
      ]),
    ], 'flex flex-col items-center w-full py-[72px] bg-[#fafafa]'),
  },
  {
    key: 'agency-case-stories-001',
    name: 'Agency Case Stories',
    type: 'layout',
    category: 'Content',
    source: 'preline',
    sort_order: 130,
    template: section([
      container([
        {
          name: 'div',
          classes: 'flex flex-col gap-[18px] max-w-[760px] mb-[36px]',
          design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '18px' }, spacing: { isActive: true, marginBottom: '36px' }, sizing: { isActive: true, maxWidth: '760px' } },
          children: [
            headingLayer('Success stories', 'h2', 'text-[38px] md:text-[44px] font-[700] leading-[1.08] tracking-[-0.03em] text-[#171717]'),
            textLayer('Global brands see measurable success when they collaborate with us. From higher conversion and payment approval rates to faster delivery cycles, discover their stories here.', 'text-[16px] leading-[1.7] text-[#737373]', 'p', {
              typography: { isActive: true, fontSize: '16px', lineHeight: '1.7', color: '#737373' },
            }),
          ],
        },
        {
          name: 'div',
          classes: 'grid grid-cols-[repeat(1,_1fr)] md:grid-cols-[repeat(3,_1fr)] gap-[18px]',
          customName: 'Stories grid',
          design: { layout: { isActive: true, display: 'Grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' } },
          children: [
            caseStudyCard('43%', 'Enhancement in Customer Engagement', 'A focused retention strategy improved brand loyalty and unlocked stronger customer engagement across the funnel.'),
            caseStudyCard('20%', 'Rise in E-commerce', 'A streamlined storefront and clearer product storytelling helped lift revenue and increase repeat purchases.'),
            caseStudyCard('12%', 'Streamlining Development', 'A more collaborative product workflow reduced delivery friction and improved launch speed for internal teams.'),
          ],
        },
      ]),
    ]),
  },
  {
    key: 'agency-testimonial-001',
    name: 'Agency Testimonial',
    type: 'layout',
    category: 'Testimonials',
    source: 'preline',
    sort_order: 140,
    template: section([
      container([
        {
          name: 'div',
          classes: 'flex flex-col gap-[18px] max-w-[760px] mb-[36px]',
          design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '18px' }, spacing: { isActive: true, marginBottom: '36px' }, sizing: { isActive: true, maxWidth: '760px' } },
          children: [
            headingLayer('Preline reviews', 'h2', 'text-[38px] md:text-[44px] font-[700] leading-[1.08] tracking-[-0.03em] text-[#171717]'),
            textLayer('With awards, momentum, and long-term partnerships, we proudly demonstrate our dedication to excellence and client success.', 'text-[16px] leading-[1.7] text-[#737373]', 'p', {
              typography: { isActive: true, fontSize: '16px', lineHeight: '1.7', color: '#737373' },
            }),
          ],
        },
        {
          name: 'div',
          classes: 'grid grid-cols-[repeat(1,_1fr)] md:grid-cols-[1.1fr_0.9fr] gap-[32px] items-center',
          design: { layout: { isActive: true, display: 'Grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', alignItems: 'center' } },
          children: [
            {
              name: 'div',
              classes: 'flex flex-col gap-[20px]',
              design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '20px' } },
              children: [
                textLayer('To say that switching to Preline has been life-changing is an understatement. My business has tripled since then.', 'text-[24px] md:text-[28px] leading-[1.45] text-[#171717]', 'blockquote', {
                  typography: { isActive: true, fontSize: '28px', lineHeight: '1.45', color: '#171717' },
                }),
                {
                  name: 'div',
                  classes: 'flex flex-col gap-[4px]',
                  design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '4px' } },
                  children: [
                    textLayer('Nicole Grazioso', 'text-[16px] font-[600] text-[#171717]', 'p', {
                      typography: { isActive: true, fontSize: '16px', fontWeight: '600', color: '#171717' },
                    }),
                    textLayer('Director Payments & Risk | Airbnb', 'text-[13px] text-[#737373]', 'p', {
                      typography: { isActive: true, fontSize: '13px', color: '#737373' },
                    }),
                  ],
                },
              ],
            },
            imageLayer('https://images.unsplash.com/photo-1671725501928-b7d85698ccd8?q=80&w=1200&auto=format&fit=crop', 'Portrait testimonial', 'w-full h-[420px] object-cover rounded-[24px]'),
          ],
        },
      ]),
    ]),
  },
  {
    key: 'agency-stats-001',
    name: 'Agency Stats',
    type: 'layout',
    category: 'Stats',
    source: 'preline',
    sort_order: 150,
    template: section([
      container([
        {
          name: 'div',
          classes: 'grid grid-cols-[repeat(1,_1fr)] md:grid-cols-[repeat(3,_1fr)] gap-[18px] p-[28px] rounded-[28px] border border-[#171717]/10 bg-[#fafafa]',
          design: {
            layout: { isActive: true, display: 'Grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' },
            spacing: { isActive: true, padding: '28px' },
            borders: { isActive: true, borderWidth: '1px', borderColor: 'rgba(23, 23, 23, 0.1)', borderRadius: '28px' },
            backgrounds: { isActive: true, backgroundColor: '#fafafa' },
          },
          children: [statItem('2,000+', 'Preline partners'), statItem('85%', 'Happy customers'), statItem('$55M+', 'Ads managed yearly')],
        },
      ]),
    ], 'flex flex-col items-center w-full py-[72px] bg-[#ffffff]'),
  },
  {
    key: 'agency-approach-001',
    name: 'Agency Approach',
    type: 'layout',
    category: 'Features',
    source: 'preline',
    sort_order: 160,
    template: section([
      container([
        {
          name: 'div',
          classes: 'flex flex-col gap-[18px] max-w-[760px] mb-[36px]',
          design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '18px' }, spacing: { isActive: true, marginBottom: '36px' }, sizing: { isActive: true, maxWidth: '760px' } },
          children: [
            headingLayer('Our approach', 'h2', 'text-[38px] md:text-[44px] font-[700] leading-[1.08] tracking-[-0.03em] text-[#171717]'),
            textLayer('This insight guides our full strategy, from research and planning to brand systems and product deployment.', 'text-[16px] leading-[1.7] text-[#737373]', 'p', {
              typography: { isActive: true, fontSize: '16px', lineHeight: '1.7', color: '#737373' },
            }),
          ],
        },
        {
          name: 'div',
          classes: 'grid grid-cols-[repeat(1,_1fr)] md:grid-cols-[0.95fr_1.05fr] gap-[28px] items-start',
          design: { layout: { isActive: true, display: 'Grid', gridTemplateColumns: '0.95fr 1.05fr', gap: '28px', alignItems: 'start' } },
          children: [
            imageLayer('https://images.unsplash.com/photo-1587614203976-365c74645e83?q=80&w=1200&auto=format&fit=crop', 'Team at work', 'w-full h-[440px] object-cover rounded-[24px]'),
            {
              name: 'div',
              classes: 'flex flex-col gap-[18px]',
              design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '18px' } },
              children: [
                timelineStep('1', 'Market Research and Analysis: Identify your target audience and understand their needs, preferences, and behaviors.'),
                timelineStep('2', 'Product Development and Testing: Build digital products or services that clearly address user needs.'),
                timelineStep('3', 'Marketing and Promotion: Develop a focused strategy to launch and grow with confidence.'),
                timelineStep('4', 'Launch and Optimization: Monitor performance, learn quickly, and iterate for stronger outcomes.'),
                buttonLayer('Schedule a call'),
              ],
            },
          ],
        },
      ]),
    ]),
  },
  {
    key: 'agency-contact-001',
    name: 'Agency Contact',
    type: 'layout',
    category: 'CTA',
    source: 'preline',
    sort_order: 170,
    template: section([
      container([
        {
          name: 'div',
          classes: 'flex flex-col gap-[18px] max-w-[760px] mb-[36px]',
          design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '18px' }, spacing: { isActive: true, marginBottom: '36px' }, sizing: { isActive: true, maxWidth: '760px' } },
          children: [
            headingLayer('Contact us', 'h2', 'text-[38px] md:text-[44px] font-[700] leading-[1.08] tracking-[-0.03em] text-[#171717]'),
            textLayer('Whatever your goal is, we will help you get there.', 'text-[16px] leading-[1.7] text-[#737373]', 'p', {
              typography: { isActive: true, fontSize: '16px', lineHeight: '1.7', color: '#737373' },
            }),
          ],
        },
        {
          name: 'div',
          classes: 'grid grid-cols-[repeat(1,_1fr)] md:grid-cols-[1fr_0.85fr] gap-[28px]',
          design: { layout: { isActive: true, display: 'Grid', gridTemplateColumns: '1fr 0.85fr', gap: '28px' } },
          children: [
            {
              name: 'form',
              customName: 'Contact form',
              classes: 'flex flex-col gap-[14px] w-full',
              design: { sizing: { isActive: true, width: '100%' }, layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '14px' } },
              children: [
                contactField('text', 'Name'),
                contactField('email', 'Email'),
                contactField('text', 'Company'),
                {
                  name: 'textarea',
                  classes: 'w-full min-h-[160px] px-[16px] py-[14px] rounded-[16px] bg-[#f5f5f5] text-[14px] text-[#171717]',
                  attributes: { placeholder: 'Tell us about your project', rows: 6 },
                  design: {
                    sizing: { isActive: true, width: '100%', minHeight: '160px' },
                    spacing: { isActive: true, paddingLeft: '16px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' },
                    borders: { isActive: true, borderRadius: '16px' },
                    backgrounds: { isActive: true, backgroundColor: '#f5f5f5' },
                    typography: { isActive: true, fontSize: '14px', color: '#171717' },
                  },
                },
                buttonLayer('Submit'),
              ],
            },
            {
              name: 'div',
              classes: 'flex flex-col gap-[24px]',
              design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '24px' } },
              children: [
                contactInfoItem('Our address:', '300 Bath Street, Tay House, Glasgow G2 4JR, United Kingdom'),
                contactInfoItem('Email us:', 'hello@example.so'),
                contactInfoItem('We’re hiring', 'We’re expanding our team and looking for talented people to join us.'),
              ],
            },
          ],
        },
      ]),
    ]),
  },
  {
    key: 'agency-footer-001',
    name: 'Agency Footer',
    type: 'layout',
    category: 'Footer',
    source: 'preline',
    sort_order: 180,
    template: section([
      container([
        {
          name: 'div',
          classes: 'flex flex-col md:flex-row md:items-center md:justify-between gap-[18px] pt-[10px]',
          design: { layout: { isActive: true, display: 'Flex', flexDirection: 'column', gap: '18px', justifyContent: 'space-between' }, spacing: { isActive: true, paddingTop: '10px' } },
          children: [
            textLayer('Preline', 'text-[22px] font-[700] tracking-[-0.03em] text-[#171717]', 'p', {
              typography: { isActive: true, fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em', color: '#171717' },
            }),
            textLayer('© 2026 Preline Labs.', 'text-[14px] text-[#737373]', 'p', {
              typography: { isActive: true, fontSize: '14px', color: '#737373' },
            }),
          ],
        },
      ]),
    ], 'flex flex-col items-center w-full py-[44px] bg-[#fafafa]'),
  },
];
