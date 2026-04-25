import 'server-only';

import { redirect } from 'next/navigation';
import type { PageSettings } from '@/types';
import { getValidatedCurrentSiteUser } from '@/lib/xxiv/site-auth-service';

function buildLoginUrl(path: string): string {
  return `/xxiv-auth/login?redirect=${encodeURIComponent(path || '/')}`;
}

export async function enforceSiteLogin(
  settings: PageSettings | undefined,
  siteId: string | undefined,
  path: string,
): Promise<void> {
  if (!settings?.requireSiteLogin) {
    return;
  }

  if (!siteId) {
    redirect(buildLoginUrl(path));
  }

  const siteUser = await getValidatedCurrentSiteUser(siteId);
  if (!siteUser) {
    redirect(buildLoginUrl(path));
  }
}
