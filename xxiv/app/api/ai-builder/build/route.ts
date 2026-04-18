import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/supabase-auth';
import { createDashboardClient } from '@/lib/xxiv/server-client';
import { aiBuilderBuildRequestSchema, type AiBuilderProgressStage } from '@/lib/ai-builder/types';
import { createAiBuilderLog, updateAiBuilderLog } from '@/lib/ai-builder/logs';
import { runAiSiteBuild, type XxivSiteRecord } from '@/lib/ai-builder/build';

export const dynamic = 'force-dynamic';

function sseEvent(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let logId: string | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const emit = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      const closeWithError = async (message: string) => {
        emit('error', { stage: 'failed', message });
        if (logId) {
          try {
            await updateAiBuilderLog(logId, { status: 'failed', error: message });
          } catch {
            // Ignore logging failures.
          }
        }
        controller.close();
      };

      void Promise.race([
        (async () => {
          try {
            const body = aiBuilderBuildRequestSchema.parse(await request.json());
            const supabase = await createDashboardClient();
            const { data: site, error: siteError } = await supabase
              .from('xxiv_sites')
              .select('id, name, user_id, slug, home_page_id, mcp_token, mcp_url')
              .eq('id', body.projectId)
              .eq('user_id', auth.user.id)
              .single();

            if (siteError || !site) {
              throw new Error('Project not found');
            }

            logId = await createAiBuilderLog({
              projectId: body.projectId,
              userId: auth.user.id,
              inputType: 'text',
              status: 'building',
              sitePlan: body.sitePlan,
            });

            const errors: string[] = [];
            const onError = async (message: string) => {
              errors.push(message);
              emit('progress', {
                stage: 'styling' satisfies AiBuilderProgressStage,
                message,
                level: 'warning',
              });
            };

            await runAiSiteBuild({
              site: site as XxivSiteRecord,
              sitePlan: body.sitePlan,
              origin: request.nextUrl.origin,
              emit,
              onError,
            });

            if (logId) {
              await updateAiBuilderLog(logId, {
                status: 'completed',
                error: errors.length > 0 ? errors.join('\n') : null,
              });
            }

            controller.close();
          } catch (error) {
            await closeWithError(error instanceof Error ? error.message : 'Failed to build site');
          }
        })(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI Builder timed out after 120 seconds')), 120000);
        }),
      ]).catch(async (error) => {
        await closeWithError(error instanceof Error ? error.message : 'Failed to build site');
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
