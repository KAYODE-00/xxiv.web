'use server';

import { requireAuthUser, createDashboardClient } from '@/lib/xxiv/server-client';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createToken } from '@/lib/repositories/mcpTokenRepository';
import { createXxivSiteRecord, setXxivSiteHomePage } from '@/lib/xxiv/site-management';
import {
  addCFCustomDomain,
  deleteCFProject,
  getCFDomainStatus,
  removeCFCustomDomain,
} from '@/lib/xxiv/cloudflare-pages';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export async function getUserSites() {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();

  // 1. Fetch sites owned by user
  const { data: owned, error: ownedError } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (ownedError) throw ownedError;

  // 2. Fetch sites where user is a collaborator
  const { data: memberships, error: memberError } = await supabase
    .from('xxiv_site_members')
    .select('site_id')
    .eq('user_id', user.id);

  if (memberError) throw memberError;

  const collabSiteIds = (memberships || []).map(m => m.site_id);
  let collaborative: any[] = [];

  if (collabSiteIds.length > 0) {
    const { data: collabData, error: collabError } = await supabase
      .from('xxiv_sites')
      .select('*')
      .in('id', collabSiteIds)
      .order('created_at', { ascending: false });
    
    if (collabError) throw collabError;
    collaborative = collabData || [];
  }

  // 3. Fetch pending invites for user's email
  const { data: pendingInvites, error: inviteError } = await supabase
    .from('xxiv_site_invites')
    .select('*, site:site_id(name, thumbnail_url)')
    .eq('email', user.email)
    .eq('status', 'pending');

  if (inviteError) {
    console.error('[getUserSites] Invite error:', inviteError);
    throw inviteError;
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
  const admin = await getSupabaseAdmin();
  const requestHeaders = await headers();

  if (!admin) {
    throw new Error('Supabase not configured');
  }

  const name = formData.get('name') as string;
  if (!name?.trim()) {
    throw new Error('Site name is required');
  }

  const site = await createXxivSiteRecord(user.id, name);
  const mcpToken = await createToken(`${name.trim()} AI Builder`);
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

  // Create home page in Xxiv (no folder)
  const { data: page, error: pageError } = await admin
    .from('pages')
    .insert({
      name: 'Home',
      slug: `home-${site.id.slice(0, 8)}`,
      page_folder_id: null,
      is_index: false,
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

  // Create empty page layers
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

  // Keep dashboard list fresh if user navigates back
  revalidatePath('/dashboard');

  // Go directly to Xxiv editor
  redirect('/xxiv/pages/' + page.id + '?xxiv_site_id=' + site.id);
}

export async function deleteSite(siteId: string) {
  const user = await requireAuthUser();
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

  if (site.cf_project_name) {
    await deleteCFProject(site.cf_project_name);
  }

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
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();
  if (!admin) throw new Error('Supabase not configured');

  const domain = rawDomain.trim().toLowerCase();
  if (!domain) throw new Error('Domain is required');

  const { data: site, error } = await supabase
    .from('xxiv_sites')
    .select('id, slug, cf_project_name, live_url')
    .eq('id', siteId)
    .single();

  if (error || !site) throw new Error('Site not found');
  if (!site.cf_project_name || !site.live_url) {
    throw new Error('Publish the site before connecting a custom domain');
  }

  await addCFCustomDomain(site.cf_project_name, domain);

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
    target: site.live_url.replace(/^https?:\/\//, ''),
  };
}

export async function checkCustomDomainStatus(siteId: string) {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();
  if (!admin) throw new Error('Supabase not configured');

  const { data: site, error } = await supabase
    .from('xxiv_sites')
    .select('id, cf_project_name, custom_domain')
    .eq('id', siteId)
    .single();

  if (error || !site) throw new Error('Site not found');
  if (!site.cf_project_name || !site.custom_domain) {
    throw new Error('No custom domain connected');
  }

  const status = await getCFDomainStatus(site.cf_project_name, site.custom_domain);

  if (status.verified) {
    await admin
      .from('xxiv_sites')
      .update({
        custom_domain_verified: true,
        live_url: `https://${site.custom_domain}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId);
  }

  revalidatePath('/dashboard');
  revalidatePath(`/sites/${siteId}/settings`);

  return status;
}

export async function removeCustomDomain(siteId: string) {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();
  if (!admin) throw new Error('Supabase not configured');

  const { data: site, error } = await supabase
    .from('xxiv_sites')
    .select('id, cf_project_name, custom_domain')
    .eq('id', siteId)
    .single();

  if (error || !site) throw new Error('Site not found');

  if (site.cf_project_name && site.custom_domain) {
    await removeCFCustomDomain(site.cf_project_name, site.custom_domain);
  }

  const { error: updateError } = await admin
    .from('xxiv_sites')
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      live_url: site.cf_project_name ? `https://${site.cf_project_name}.pages.dev` : null,
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
