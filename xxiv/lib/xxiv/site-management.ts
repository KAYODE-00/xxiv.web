import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateSiteThumbnail } from '@/lib/xxiv/site-thumbnail';

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

  try {
    const thumbnailUrl = await generateSiteThumbnail(data.id, data.name);
    const { data: updatedData, error: thumbnailError } = await admin
      .from('xxiv_sites')
      .update({
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .select('*')
      .single();

    if (!thumbnailError && updatedData) {
      return updatedData;
    }
  } catch {
    // Keep site creation successful even if thumbnail generation fails.
  }

  return data;
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
