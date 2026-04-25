import 'server-only';

import { cookies } from 'next/headers';
import { credentials } from '@/lib/credentials';
import { parseSupabaseConfig } from '@/lib/supabase-config-parser';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { SupabaseConfig } from '@/types';

export type CurrentSiteContext = {
  id: string;
  name: string;
  slug: string;
  live_url: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean | null;
};

export async function getCurrentXxivSiteId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('xxiv_site_id')?.value || null;
}

export async function getCurrentXxivSiteContext(): Promise<CurrentSiteContext | null> {
  const siteId = await getCurrentXxivSiteId();
  if (!siteId) {
    return null;
  }

  const admin = await getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  const { data } = await admin
    .from('xxiv_sites')
    .select('id, name, slug, live_url, custom_domain, custom_domain_verified')
    .eq('id', siteId)
    .maybeSingle();

  return data || null;
}

export async function getSupabasePublicConfig(): Promise<{ url: string; anonKey: string } | null> {
  const config = await credentials.get<SupabaseConfig>('supabase_config');
  if (!config) {
    return null;
  }

  const parsed = parseSupabaseConfig(config);
  return {
    url: parsed.projectUrl,
    anonKey: parsed.anonKey,
  };
}
