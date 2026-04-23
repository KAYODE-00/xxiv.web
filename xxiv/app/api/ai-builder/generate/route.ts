import { NextRequest, NextResponse } from 'next/server';
import { createDashboardClient } from '@/lib/xxiv/server-client';
import { getAuthUser } from '@/lib/supabase-auth';
import { createAiBuilderLog, updateAiBuilderLog } from '@/lib/ai-builder/logs';
import { normalizeSitePlan } from '@/lib/ai-builder/site-plan';
import { generateSitePlanWithProvider } from '@/lib/ai-builder/providers';
import {
  aiBuilderGenerateRequestSchema,
  aiBuilderSitePlanSchema,
  type AiBuilderGenerateRequest,
} from '@/lib/ai-builder/types';

export const dynamic = 'force-dynamic';

function sanitizeHtmlSnippet(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 2500);
}

async function buildReferenceUrlContext(referenceUrl?: string) {
  if (!referenceUrl) return '';

  try {
    const response = await fetch(referenceUrl, {
      headers: {
        'User-Agent': 'XXIV AI Builder/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return `Reference URL: ${referenceUrl}\nUnable to fetch the page content directly, but use the URL as inspiration.`;
    }

    const html = await response.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i)?.[1]?.trim() || '';
    const headings = Array.from(
      html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi),
      (match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    )
      .filter(Boolean)
      .slice(0, 12);

    return [
      `Reference URL: ${referenceUrl}`,
      title ? `Page title: ${sanitizeHtmlSnippet(title)}` : '',
      description ? `Meta description: ${sanitizeHtmlSnippet(description)}` : '',
      headings.length > 0 ? `Visible headings: ${headings.map(sanitizeHtmlSnippet).join(' | ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  } catch {
    return `Reference URL: ${referenceUrl}\nUnable to fetch the page content directly, but use the URL as inspiration.`;
  }
}

function buildPlanningPrompt(payload: AiBuilderGenerateRequest, referenceUrlContext: string) {
  const promptParts = [
    payload.siteName ? `Brand/site name: ${payload.siteName}` : '',
    payload.prompt?.trim() || payload.description?.trim() || '',
    referenceUrlContext,
    payload.inputSource === 'upload'
      ? 'The uploaded image may be a screenshot, figma export, or design reference. Recreate the composition faithfully, then translate it into a polished, production-ready XXIV website.'
      : '',
  ];

  return promptParts.filter(Boolean).join('\n\n');
}

export async function POST(request: NextRequest) {
  let logId: string | null = null;

  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await aiBuilderGenerateRequestSchema.parseAsync(await request.json());
    if (payload.imageBase64 && !payload.imageMediaType) {
      return NextResponse.json({ error: 'imageMediaType is required when imageBase64 is provided' }, { status: 400 });
    }

    const supabase = await createDashboardClient();
    const { data: site, error: siteError } = await supabase
      .from('xxiv_sites')
      .select('id')
      .eq('id', payload.projectId)
      .eq('user_id', auth.user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    logId = await createAiBuilderLog({
      projectId: payload.projectId,
      userId: auth.user.id,
      inputType: payload.imageBase64 ? 'image' : payload.referenceUrl ? 'text' : 'text',
      status: 'planning',
    });

    const referenceUrlContext = await buildReferenceUrlContext(payload.referenceUrl);
    const prompt = buildPlanningPrompt(payload, referenceUrlContext);
    const generatedPlan = await generateSitePlanWithProvider(payload, prompt);
    const sitePlan = normalizeSitePlan(aiBuilderSitePlanSchema.parse(generatedPlan));

    await updateAiBuilderLog(logId, {
      status: 'building',
      sitePlan,
      error: null,
    });

    return NextResponse.json(sitePlan, { status: 200 });
  } catch (error) {
    if (logId) {
      try {
        await updateAiBuilderLog(logId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed to generate site plan',
        });
      } catch {
        // Ignore log update failures.
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to generate site plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
