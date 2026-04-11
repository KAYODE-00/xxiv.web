import { createDashboardClient, getAuthUser } from '@/lib/xxiv/server-client';
import { createVercelProject, triggerDeploy, getDeploymentStatus } from '@/lib/xxiv/vercel-deploy';

type PublishEvent =
  | { type: 'progress'; message: string }
  | { type: 'status'; status: 'BUILDING' | 'READY' | 'ERROR'; url?: string }
  | { type: 'complete'; liveUrl: string; customDomain: string | null; vercelUrl: string }
  | { type: 'error'; message: string };

function createSseStream(handler: (send: (event: PublishEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: PublishEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      handler(send)
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Publish failed';
          send({ type: 'error', message });
        })
        .finally(() => controller.close());
    },
  });

  return stream;
}

export async function POST(request: Request) {
  const stream = createSseStream(async (send) => {
    const body = await request.json().catch(() => ({}));
    const siteId = body?.xxiv_site_id as string | undefined;

    if (!siteId) {
      send({ type: 'error', message: 'Missing xxiv_site_id' });
      return;
    }

    const user = await getAuthUser();
    if (!user) {
      send({ type: 'error', message: 'Not authenticated' });
      return;
    }

    const supabase = await createDashboardClient();

    const { data: site, error: siteError } = await supabase
      .from('xxiv_sites')
      .select('*')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (siteError || !site) {
      send({ type: 'error', message: 'Site not found' });
      return;
    }

    let projectId = site.vercel_project_id as string | null;
    let projectName = site.vercel_project_name as string | null;
    let deployHookId = site.vercel_deploy_hook as string | null;

    if (!projectId || !projectName || !deployHookId) {
      send({ type: 'progress', message: 'Creating Vercel project...' });
      const created = await createVercelProject(site.slug, site.id);
      projectId = created.projectId;
      projectName = created.projectName;
      deployHookId = created.deployHookId;

      const { error: updateError } = await supabase
        .from('xxiv_sites')
        .update({
          vercel_project_id: projectId,
          vercel_project_name: projectName,
          vercel_deploy_hook: deployHookId,
          live_url: created.vercelUrl,
        })
        .eq('id', site.id);

      if (updateError) {
        throw updateError;
      }
    }

    send({ type: 'progress', message: 'Triggering deployment...' });
    const { deploymentId } = await triggerDeploy(deployHookId);

    const start = Date.now();
    const timeoutMs = 3 * 60 * 1000;

    while (Date.now() - start < timeoutMs) {
      const status = await getDeploymentStatus(deploymentId);
      send({ type: 'status', status: status.status, url: status.url });

      if (status.status === 'READY') {
        const vercelUrl = `https://${projectName}.vercel.app`;
        const now = new Date().toISOString();

        const { error: publishError } = await supabase
          .from('xxiv_sites')
          .update({
            is_published: true,
            live_url: vercelUrl,
            last_published_at: now,
          })
          .eq('id', site.id);

        if (publishError) {
          throw publishError;
        }

        send({
          type: 'complete',
          liveUrl: vercelUrl,
          customDomain: site.custom_domain || null,
          vercelUrl,
        });
        return;
      }

      if (status.status === 'ERROR') {
        send({ type: 'error', message: 'Deployment failed' });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    send({ type: 'error', message: 'Deployment timed out' });
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
