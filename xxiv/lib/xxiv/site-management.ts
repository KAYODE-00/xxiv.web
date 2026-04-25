import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateAndStoreThumbnail } from '@/lib/xxiv/site-thumbnail';

export interface XxivSiteRecord {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  plan: string | null;
  page_folder_id: string | null;
  home_page_id: string | null;
  is_published: boolean | null;
  publish_status: string | null;
  thumbnail_url?: string | null;
  mcp_token?: string | null;
  mcp_url?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function sanitizeSiteSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
}

export function buildUniqueSiteSlug(name: string): string {
  const baseSlug = sanitizeSiteSlug(name) || 'site';
  return `${baseSlug}-${Date.now().toString(36)}`;
}

export async function createXxivSiteRecord(userId: string, name: string): Promise<XxivSiteRecord> {
  const admin = await getSupabaseAdmin();

  if (!admin) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await admin
    .from('xxiv_sites')
    .insert({
      name,
      slug: buildUniqueSiteSlug(name),
      user_id: userId,
      plan: 'free',
      page_folder_id: null,
      home_page_id: null,
      is_published: false,
      publish_status: 'unpublished',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create site');
  }

  return data;
}

export function queueSiteThumbnailGeneration(
  siteId: string,
  siteName: string,
  options?: { isLive?: boolean },
): void {
  void (async () => {
    const admin = await getSupabaseAdmin();
    if (!admin) {
      return;
    }

    const thumbnailUrl = await generateAndStoreThumbnail(siteName, siteId, options);
    if (!thumbnailUrl) {
      return;
    }

    await admin
      .from('xxiv_sites')
      .update({
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId);
  })().catch((error) => {
    console.error('[site-thumbnail] Background update failed:', error);
  });
}

export async function setXxivSiteHomePage(siteId: string, pageId: string): Promise<void> {
  const admin = await getSupabaseAdmin();

  if (!admin) {
    throw new Error('Supabase not configured');
  }

  const { error } = await admin
    .from('xxiv_sites')
    .update({
      home_page_id: pageId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  if (error) {
    throw new Error(error.message);
  }
}
