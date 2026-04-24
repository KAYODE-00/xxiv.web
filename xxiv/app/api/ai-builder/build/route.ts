import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/supabase-auth';
import { createDashboardClient } from '@/lib/xxiv/server-client';
import { aiBuilderBuildRequestSchema, type AiBuilderProgressStage } from '@/lib/ai-builder/types';
import { createAiBuilderLog, updateAiBuilderLog } from '@/lib/ai-builder/logs';
import { runAiSiteBuild, type XxivSiteRecord } from '@/lib/ai-builder/build';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const AI_BUILDER_BUILD_TIMEOUT_MS = 5 * 60 * 1000;
const SSE_HEARTBEAT_MS = 15 * 1000;

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
      let closed = false;
      let heartbeatId: ReturnType<typeof setInterval> | null = null;

      const emit = (event: string, data: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeatId) {
          clearInterval(heartbeatId);
          heartbeatId = null;
        }
        controller.close();
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
        close();
      };

      heartbeatId = setInterval(() => {
        emit('ping', { ts: Date.now() });
      }, SSE_HEARTBEAT_MS);

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

            close();
          } catch (error) {
            await closeWithError(error instanceof Error ? error.message : 'Failed to build site');
          }
        })(),
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('AI Builder timed out after 10 minutes')),
            AI_BUILDER_BUILD_TIMEOUT_MS,
          );
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
