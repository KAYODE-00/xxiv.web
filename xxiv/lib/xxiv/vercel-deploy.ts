import 'server-only';

type VercelEnvVar = {
  key: string;
  value: string;
  target: Array<'production' | 'preview' | 'development'>;
};

type VercelProjectResponse = {
  id: string;
  name: string;
  link?: {
    deployHookId?: string;
  };
};

const VERCEL_API_BASE = 'https://api.vercel.com';

function getVercelToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('VERCEL_TOKEN is not set');
  }
  return token;
}

function getVercelTeamId(): string | null {
  return process.env.VERCEL_TEAM_ID || null;
}

function withTeamId(url: string): string {
  const teamId = getVercelTeamId();
  if (!teamId) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}teamId=${encodeURIComponent(teamId)}`;
}

async function vercelFetch<T>(url: string, init: RequestInit): Promise<T> {
  const token = getVercelToken();
  const response = await fetch(withTeamId(url), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Vercel API error (${response.status})`);
  }

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

function buildProjectEnvVars(siteId: string): VercelEnvVar[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is not set');
  }
  if (!supabaseUrl || !supabaseAnon) {
    throw new Error('Supabase public env vars are not set');
  }

  return [
    { key: 'XXIV_SITE_ID', value: siteId, target: ['production'] },
    { key: 'XXIV_API_URL', value: appUrl, target: ['production'] },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: supabaseUrl, target: ['production'] },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: supabaseAnon, target: ['production'] },
  ];
}

export async function createVercelProject(
  siteSlug: string,
  siteId: string
): Promise<{ projectId: string; projectName: string; deployHookId: string; vercelUrl: string }> {
  const projectName = `xxiv-${siteSlug}`;
  const body = {
    name: projectName,
    framework: 'nextjs',
    environmentVariables: buildProjectEnvVars(siteId),
  };

  const result = await vercelFetch<VercelProjectResponse>(
    `${VERCEL_API_BASE}/v10/projects`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  const deployHookId = result.link?.deployHookId;
  if (!deployHookId) {
    throw new Error('Vercel project created but deploy hook missing');
  }

  return {
    projectId: result.id,
    projectName: result.name,
    deployHookId,
    vercelUrl: `https://${result.name}.vercel.app`,
  };
}

export async function triggerDeploy(
  deployHookId: string
): Promise<{ deploymentId: string }> {
  const result = await vercelFetch<{ job?: { id?: string } }>(
    `${VERCEL_API_BASE}/v1/integrations/deploy/${deployHookId}`,
    {
      method: 'POST',
    }
  );

  const deploymentId = result.job?.id;
  if (!deploymentId) {
    throw new Error('Deploy hook triggered but no deployment id returned');
  }

  return { deploymentId };
}

export async function getDeploymentStatus(
  deploymentId: string
): Promise<{ status: 'BUILDING' | 'READY' | 'ERROR'; url?: string }> {
  const result = await vercelFetch<{ status?: string; readyState?: string; url?: string }>(
    `${VERCEL_API_BASE}/v13/deployments/${deploymentId}`,
    { method: 'GET' }
  );

  const state = (result.status || result.readyState || '').toUpperCase();
  if (state === 'READY') {
    return { status: 'READY', url: result.url ? `https://${result.url}` : undefined };
  }
  if (state === 'ERROR') {
    return { status: 'ERROR' };
  }
  return { status: 'BUILDING' };
}

export async function addCustomDomain(
  projectId: string,
  domain: string
): Promise<{ configured: boolean; verificationRequired: boolean; txtRecord?: string }> {
  const result = await vercelFetch<any>(
    `${VERCEL_API_BASE}/v10/projects/${projectId}/domains`,
    {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    }
  );

  const verified = !!result?.verified;
  const verificationRequired = !verified;
  const txtRecord = result?.verification?.[0]?.value || undefined;

  return {
    configured: verified,
    verificationRequired,
    txtRecord,
  };
}

export async function removeCustomDomain(
  projectId: string,
  domain: string
): Promise<void> {
  await vercelFetch(
    `${VERCEL_API_BASE}/v10/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
    {
      method: 'DELETE',
    }
  );
}

export async function getProjectDomains(
  projectId: string
): Promise<Array<{ name: string; verified: boolean; vercelUrl?: string }>> {
  const result = await vercelFetch<{ domains?: Array<{ name: string; verified: boolean }> }>(
    `${VERCEL_API_BASE}/v9/projects/${projectId}/domains`,
    { method: 'GET' }
  );

  return (result.domains || []).map((domain) => ({
    name: domain.name,
    verified: !!domain.verified,
    vercelUrl: `https://${domain.name}`,
  }));
}
