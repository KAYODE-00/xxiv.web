import 'server-only';

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const CF_BASE = 'https://api.cloudflare.com/client/v4';
const execFileAsync = promisify(execFile);

function requireEnv(name: 'CF_ACCOUNT_ID' | 'CF_API_TOKEN'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function apiHeaders() {
  return {
    Authorization: `Bearer ${requireEnv('CF_API_TOKEN')}`,
    'Content-Type': 'application/json',
  };
}

function normalizeCloudflareError(message: string, operation: string): string {
  if (/authentication error/i.test(message) || /invalid api token/i.test(message) || /invalid request headers/i.test(message)) {
    return `Cloudflare authentication failed during ${operation}. Check CF_ACCOUNT_ID and CF_API_TOKEN, make sure the token has Cloudflare Pages permissions, and restart the dev server after changing env vars.`;
  }

  if (/permission/i.test(message) || /forbidden/i.test(message)) {
    return `Cloudflare rejected ${operation} because of missing permissions. Update the API token to include Cloudflare Pages access for your account.`;
  }

  return message;
}

async function parseCloudflareResponse<T>(response: Response, operation: string): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const message = normalizeCloudflareError(
      data?.errors?.[0]?.message ||
      data?.messages?.[0]?.message ||
      `Cloudflare request failed with status ${response.status}`,
      operation,
    );
    throw new Error(message);
  }

  return data.result as T;
}

export function buildCFProjectName(siteSlug: string, siteId: string): string {
  const normalizedSlug = siteSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const suffix = siteId.replace(/-/g, '').slice(0, 10);
  return `xxiv-${normalizedSlug || 'site'}-${suffix}`.slice(0, 58);
}

export async function createCFProject(
  projectName: string,
): Promise<{ id: string; name: string; subdomain: string }> {
  const accountId = requireEnv('CF_ACCOUNT_ID');
  const existing = await fetch(`${CF_BASE}/accounts/${accountId}/pages/projects/${projectName}`, {
    headers: apiHeaders(),
    cache: 'no-store',
  });

  if (existing.ok) {
    const result = await parseCloudflareResponse<{ id: string; name: string; subdomain: string }>(existing, `project lookup for ${projectName}`);
    return {
      id: result.id,
      name: result.name,
      subdomain: result.subdomain,
    };
  }

  const response = await fetch(`${CF_BASE}/accounts/${accountId}/pages/projects`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      name: projectName,
      production_branch: 'main',
    }),
    cache: 'no-store',
  });

  const result = await parseCloudflareResponse<{ id: string; name: string; subdomain: string }>(response, `project creation for ${projectName}`);
  return {
    id: result.id,
    name: result.name,
    subdomain: result.subdomain,
  };
}

export async function deployFilesToCF(
  projectName: string,
  files: Record<string, string>,
): Promise<{ deploymentId: string; url: string }> {
  const accountId = requireEnv('CF_ACCOUNT_ID');
  const apiToken = requireEnv('CF_API_TOKEN');
  const tempRoot = await mkdtemp(join(tmpdir(), 'xxiv-cf-pages-'));

  try {
    const manifest: Record<string, string> = {};

    for (const [filePath, content] of Object.entries(files)) {
      manifest[`/${filePath}`] = createHash('sha256').update(content).digest('hex');
      const absolutePath = join(tempRoot, filePath);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content, 'utf8');
    }

    await writeFile(join(tempRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    const commonEnv = {
      ...process.env,
      CI: '1',
      CLOUDFLARE_ACCOUNT_ID: accountId,
      CLOUDFLARE_API_TOKEN: apiToken,
    };

    const { stdout, stderr } = process.platform === 'win32'
      ? await execFileAsync(
          'cmd.exe',
          [
            '/d',
            '/s',
            '/c',
            join(process.cwd(), 'node_modules', '.bin', 'wrangler.cmd'),
            'pages',
            'deploy',
            tempRoot,
            `--project-name=${projectName}`,
            '--branch=main',
            '--commit-dirty=true',
          ],
          {
            cwd: process.cwd(),
            env: commonEnv,
            windowsHide: true,
          },
        )
      : await execFileAsync(
          join(process.cwd(), 'node_modules', '.bin', 'wrangler'),
          [
            'pages',
            'deploy',
            tempRoot,
            `--project-name=${projectName}`,
            '--branch=main',
            '--commit-dirty=true',
          ],
          {
            cwd: process.cwd(),
            env: commonEnv,
          },
        );

    const output = `${stdout}\n${stderr}`;
    const urlMatch = output.match(/https:\/\/[^\s]+/);

    return {
      deploymentId: '',
      url: urlMatch?.[0] || `https://${projectName}.pages.dev`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(normalizeCloudflareError(message, `deployment upload for ${projectName}`));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function getCFDeploymentStatus(
  projectName: string,
  deploymentId: string,
): Promise<'building' | 'success' | 'failure' | 'canceled'> {
  const accountId = requireEnv('CF_ACCOUNT_ID');
  const response = await fetch(
    `${CF_BASE}/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}`,
    {
      headers: apiHeaders(),
      cache: 'no-store',
    },
  );

  const result = await parseCloudflareResponse<{ latest_stage?: { status?: 'building' | 'success' | 'failure' | 'canceled' } }>(response, `deployment status lookup for ${projectName}`);
  return result.latest_stage?.status || 'building';
}

export async function addCFCustomDomain(projectName: string, domain: string): Promise<{ success: boolean }> {
  const accountId = requireEnv('CF_ACCOUNT_ID');
  const response = await fetch(`${CF_BASE}/accounts/${accountId}/pages/projects/${projectName}/domains`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ name: domain }),
    cache: 'no-store',
  });

  await parseCloudflareResponse(response, `custom domain add for ${projectName}`);
  return { success: true };
}

export async function removeCFCustomDomain(projectName: string, domain: string): Promise<void> {
  const accountId = requireEnv('CF_ACCOUNT_ID');
  const response = await fetch(
    `${CF_BASE}/accounts/${accountId}/pages/projects/${projectName}/domains/${domain}`,
    {
      method: 'DELETE',
      headers: apiHeaders(),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to remove custom domain ${domain}`);
  }
}

export async function getCFDomainStatus(
  projectName: string,
  domain: string,
): Promise<{ verified: boolean; status: string }> {
  const accountId = requireEnv('CF_ACCOUNT_ID');
  const response = await fetch(`${CF_BASE}/accounts/${accountId}/pages/projects/${projectName}/domains`, {
    headers: apiHeaders(),
    cache: 'no-store',
  });

  const result = await parseCloudflareResponse<Array<{ name: string; status: string }>>(response, `custom domain status for ${projectName}`);
  const match = result.find((entry) => entry.name === domain);

  return {
    verified: match?.status === 'active',
    status: match?.status || 'pending',
  };
}

export async function deleteCFProject(projectName: string): Promise<void> {
  const accountId = requireEnv('CF_ACCOUNT_ID');
  const response = await fetch(`${CF_BASE}/accounts/${accountId}/pages/projects/${projectName}`, {
    method: 'DELETE',
    headers: apiHeaders(),
    cache: 'no-store',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete Cloudflare Pages project ${projectName}`);
  }
}

function getMimeType(filename: string): string {
  if (filename.endsWith('.html')) return 'text/html';
  if (filename.endsWith('.css')) return 'text/css';
  if (filename.endsWith('.js')) return 'application/javascript';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webp')) return 'image/webp';
  if (filename.endsWith('.ico')) return 'image/x-icon';
  if (filename.endsWith('.woff2')) return 'font/woff2';
  if (filename.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}
