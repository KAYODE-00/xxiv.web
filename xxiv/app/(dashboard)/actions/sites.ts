'use server';

import { requireAuthUser, createDashboardClient } from '@/lib/xxiv/server-client';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createToken } from '@/lib/repositories/mcpTokenRepository';
import { createXxivSiteRecord, queueSiteThumbnailGeneration, setXxivSiteHomePage } from '@/lib/xxiv/site-management';
import { buildXxivSiteUrl } from '@/lib/url-utils';
import { buildXxivIndexSlug } from '@/lib/xxiv/index-slug';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function provisionXxivSite(userId: string, name: string, requestHeaders: Headers) {
  const admin = await getSupabaseAdmin();

  if (!admin) {
    throw new Error('Supabase not configured');
  }

  const site = await createXxivSiteRecord(userId, name);
  queueSiteThumbnailGeneration(site.id, site.name);
  const mcpToken = await createToken(`${name.trim()} AI Builder`, {
    ownerUserId: userId,
    isSystemGenerated: true,
  });
  const protocol = requestHeaders.get('x-forwarded-proto') || 'http';
  const host = requestHeaders.get('host') || 'localhost:3000';
  const mcpUrl = `${protocol}://${host}/xxiv/mcp/${mcpToken.token}`;

  await admin
    .from('xxiv_sites')
    .update({
      mcp_token: mcpToken.token,
      mcp_url: mcpUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', site.id);

  const { data: page, error: pageError } = await admin
    .from('pages')
    .insert({
      name: 'Home',
      slug: buildXxivIndexSlug(site.id),
      page_folder_id: null,
      is_index: true,
      is_dynamic: false,
      depth: 0,
      order: 0,
      is_published: false,
      xxiv_site_id: site.id,
      settings: {
        xxiv: {
          site_id: site.id,
        },
      },
    })
    .select()
    .single();

  if (pageError) throw pageError;

  await admin.from('page_layers').insert({
    page_id: page.id,
    layers: [
      {
        id: 'body',
        name: 'body',
        classes: '',
        children: [],
      },
    ],
    is_published: false,
  });

  await setXxivSiteHomePage(site.id, page.id);
  revalidatePath('/dashboard');

  return {
    siteId: site.id,
    homePageId: page.id,
    editorUrl: '/xxiv/pages/' + page.id + '?xxiv_site_id=' + site.id,
  };
}

async function buildSiteLiveUrl(
  siteId: string,
  siteSlug?: string | null,
  customDomain?: string | null,
  customDomainVerified?: boolean | null,
) {
  if (customDomain && customDomainVerified) {
    return `https://${customDomain}`;
  }

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
  const protocol = headerStore.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const fallbackOrigin = host ? `${protocol}://${host}` : null;

  if (siteSlug) {
    return buildXxivSiteUrl(siteSlug, { fallbackOrigin });
  }

  return host
    ? `${protocol}://${host}/?xxiv_site_id=${encodeURIComponent(siteId)}`
    : `/?xxiv_site_id=${encodeURIComponent(siteId)}`;
}

export async function getUserSites() {
  const user = await requireAuthUser();
  const admin = await getSupabaseAdmin();

  if (!admin) {
    throw new Error('Supabase not configured');
  }

  // 1. Fetch sites owned by user.
  // Use the admin client here and scope manually to the authenticated user so
  // dashboard rendering does not depend on fragile RLS behavior.
  const { data: owned, error: ownedError } = await admin
    .from('xxiv_sites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (ownedError) throw ownedError;

  const ownedSiteIds = new Set((owned || []).map((site) => site.id));

  // 2. Fetch sites where user is a collaborator.
  // Do not fail the entire dashboard if collaboration tables or policies are
  // missing in a partially migrated production environment.
  let collabSiteIds: string[] = [];
  try {
    const { data: memberships, error: memberError } = await admin
      .from('xxiv_site_members')
      .select('site_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('[getUserSites] Membership query error:', memberError);
    } else {
      collabSiteIds = (memberships || [])
        .map((membership) => membership.site_id)
        .filter((siteId): siteId is string => typeof siteId === 'string' && !ownedSiteIds.has(siteId));
    }
  } catch (error) {
    console.error('[getUserSites] Membership lookup failed:', error);
  }

  let collaborative: any[] = [];

  if (collabSiteIds.length > 0) {
    const { data: collabData, error: collabError } = await admin
      .from('xxiv_sites')
      .select('*')
      .in('id', collabSiteIds)
      .order('created_at', { ascending: false });
    
    if (collabError) throw collabError;
    collaborative = collabData || [];
  }

  // 3. Fetch pending invites for user's email.
  // Avoid relationship-select syntax here because production PostgREST schema
  // cache can lag and crash the whole server render.
  let pendingInvites: any[] = [];
  try {
    const { data: inviteRows, error: inviteError } = await admin
      .from('xxiv_site_invites')
      .select('id, site_id, email, status, created_at')
      .eq('email', user.email)
      .eq('status', 'pending');

    if (inviteError) {
      console.error('[getUserSites] Invite query error:', inviteError);
    } else {
      const inviteSiteIds = Array.from(
        new Set(
          (inviteRows || [])
            .map((invite) => invite.site_id)
            .filter((siteId): siteId is string => typeof siteId === 'string')
        )
      );

      let siteMap = new Map<string, { id: string; name: string; thumbnail_url: string | null }>();

      if (inviteSiteIds.length > 0) {
        const { data: inviteSites, error: inviteSitesError } = await admin
          .from('xxiv_sites')
          .select('id, name, thumbnail_url')
          .in('id', inviteSiteIds);

        if (inviteSitesError) {
          console.error('[getUserSites] Invite site lookup error:', inviteSitesError);
        } else {
          siteMap = new Map(
            (inviteSites || []).map((site) => [
              site.id,
              { id: site.id, name: site.name, thumbnail_url: site.thumbnail_url },
            ])
          );
        }
      }

      pendingInvites = (inviteRows || []).map((invite) => ({
        ...invite,
        site: invite.site_id ? siteMap.get(invite.site_id) || null : null,
      }));
    }
  } catch (error) {
    console.error('[getUserSites] Invite lookup failed:', error);
  }

  return {
    owned: owned || [],
    collaborative: collaborative,
    pendingInvites: pendingInvites || []
  };
}

export async function respondToInvite(inviteId: string, accept: boolean) {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();

  if (!admin) throw new Error('Supabase admin not configured');

  // 1. Get invite details using user's client to verify they can actually see this invite
  // RLS on xxiv_site_invites ensures they can only see invites matching their email.
  const { data: invite, error: inviteError } = await supabase
    .from('xxiv_site_invites')
    .select('site_id, email')
    .eq('id', inviteId)
    .single();

  if (inviteError || !invite) throw new Error('Invite not found or access denied');

  if (accept) {
    // 2. Add to members using ADMIN client to bypass RLS (since user is not yet a member)
    const { error: memberError } = await admin
      .from('xxiv_site_members')
      .upsert({
        site_id: invite.site_id,
        user_id: user.id,
        role: 'collaborator'
      }, { onConflict: 'site_id, user_id' });

    if (memberError) throw memberError;

    // 3. Update invite status using ADMIN
    await admin
      .from('xxiv_site_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId);
  } else {
    // Just mark as ignored using ADMIN
    await admin
      .from('xxiv_site_invites')
      .update({ status: 'ignored' })
      .eq('id', inviteId);
  }

  revalidatePath('/dashboard');
}

export async function getSiteById(siteId: string) {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();

  const { data, error } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (error) throw error;
  return data;
}

export async function createSite(formData: FormData) {
  const user = await requireAuthUser();
  const requestHeaders = await headers();

  const name = formData.get('name') as string;
  if (!name?.trim()) {
    throw new Error('Site name is required');
  }

  const result = await provisionXxivSite(user.id, name, requestHeaders);
  redirect(result.editorUrl);
}

export async function createSiteDraft(name: string) {
  const user = await requireAuthUser();
  const requestHeaders = await headers();

  if (!name?.trim()) {
    throw new Error('Site name is required');
  }

  return provisionXxivSite(user.id, name.trim(), requestHeaders);
}

export async function deleteSite(siteId: string) {
  await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();

  if (!admin) {
    throw new Error('Supabase not configured');
  }

  // Get site (RLS ensures ownership)
  const { data: site, error: siteError } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (siteError) throw siteError;
  if (!site) throw new Error('Site not found');

  // Delete all Xxiv pages belonging to this site (tagged in settings)
  const { data: pages, error: pagesError } = await admin
    .from('pages')
    .select('id')
    .eq('is_published', false)
    .contains('settings', { xxiv: { site_id: siteId } });

  if (pagesError) throw pagesError;

  const pageIds = (pages || []).map((p) => p.id);
  if (pageIds.length > 0) {
    await admin.from('page_layers').delete().in('page_id', pageIds);
    await admin.from('pages').delete().in('id', pageIds);
  }

  // Delete XXIV site (RLS enforces ownership)
  const { error: deleteError } = await supabase.from('xxiv_sites').delete().eq('id', siteId);
  if (deleteError) throw deleteError;

  revalidatePath('/dashboard');
}

export async function getSiteSettings(siteId: string) {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();

  const { data: site, error } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (error) throw error;
  return site;
}

export async function connectCustomDomain(siteId: string, rawDomain: string) {
  await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();
  if (!admin) throw new Error('Supabase not configured');

  const domain = rawDomain.trim().toLowerCase();
  if (!domain) throw new Error('Domain is required');

  const { data: site, error } = await supabase
    .from('xxiv_sites')
    .select('id')
    .eq('id', siteId)
    .single();

  if (error || !site) throw new Error('Site not found');

  const { error: updateError } = await admin
    .from('xxiv_sites')
    .update({
      custom_domain: domain,
      custom_domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  if (updateError) throw updateError;

  revalidatePath('/dashboard');
  revalidatePath(`/sites/${siteId}/settings`);

  return {
    domain,
    target: 'your XXIV app domain',
  };
}

export async function checkCustomDomainStatus(siteId: string) {
  await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();
  if (!admin) throw new Error('Supabase not configured');

  const { data: site, error } = await supabase
    .from('xxiv_sites')
    .select('id, slug, custom_domain')
    .eq('id', siteId)
    .single();

  if (error || !site) throw new Error('Site not found');
  if (!site.custom_domain) {
    throw new Error('No custom domain connected');
  }
  const liveUrl = await buildSiteLiveUrl(siteId, site.slug, site.custom_domain, true);

  await admin
    .from('xxiv_sites')
    .update({
      custom_domain_verified: true,
      live_url: liveUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  revalidatePath('/dashboard');
  revalidatePath(`/sites/${siteId}/settings`);

  return {
    verified: true,
    status: 'verified',
  };
}

export async function removeCustomDomain(siteId: string) {
  await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();
  if (!admin) throw new Error('Supabase not configured');

  const { data: site, error } = await supabase
    .from('xxiv_sites')
    .select('id, slug, custom_domain')
    .eq('id', siteId)
    .single();

  if (error || !site) throw new Error('Site not found');
  const liveUrl = await buildSiteLiveUrl(siteId, site.slug);

  const { error: updateError } = await admin
    .from('xxiv_sites')
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      live_url: liveUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  if (updateError) throw updateError;

  revalidatePath('/dashboard');
  revalidatePath(`/sites/${siteId}/settings`);
}

export async function openSiteEditor(siteId: string) {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();

  const { data: site, error } = await supabase
    .from('xxiv_sites')
    .select('home_page_id')
    .eq('id', siteId)
    .single();

  if (error) throw error;

  if (!site?.home_page_id) {
    throw new Error('No page found for this site');
  }

  redirect('/xxiv/pages/' + site.home_page_id + '?xxiv_site_id=' + siteId);
}
