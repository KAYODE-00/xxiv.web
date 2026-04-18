import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createDashboardClient } from '@/lib/xxiv/server-client';
import { getAuthUser } from '@/lib/supabase-auth';
import { createAiBuilderLog, updateAiBuilderLog } from '@/lib/ai-builder/logs';
import { AI_BUILDER_SYSTEM_PROMPT, extractClaudeText, normalizeSitePlan, parseSitePlanJson } from '@/lib/ai-builder/site-plan';
import { aiBuilderGenerateRequestSchema, aiBuilderSitePlanSchema } from '@/lib/ai-builder/types';

export const dynamic = 'force-dynamic';

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  return new Anthropic({ apiKey });
}

export async function POST(request: NextRequest) {
  let logId: string | null = null;

  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = aiBuilderGenerateRequestSchema.parse(await request.json());
    if (!payload.description && !payload.imageBase64) {
      return NextResponse.json({ error: 'Provide a description or image input' }, { status: 400 });
    }
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
      inputType: payload.imageBase64 ? 'image' : 'text',
      status: 'planning',
    });

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: payload.imageBase64 ? 'claude-opus-4-6' : 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: AI_BUILDER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: payload.imageBase64
            ? [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: payload.imageMediaType!,
                    data: payload.imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: payload.description?.trim()
                    ? `Additional instructions:\n${payload.description.trim()}`
                    : 'Recreate this website design as a complete site plan.',
                },
              ]
            : [{ type: 'text', text: payload.description!.trim() }],
        },
      ],
    });

    const rawText = extractClaudeText(response.content);
    const parsedPlan = parseSitePlanJson(rawText);
    const sitePlan = normalizeSitePlan(aiBuilderSitePlanSchema.parse(parsedPlan));

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
