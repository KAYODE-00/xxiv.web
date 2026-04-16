'use server';

import { requireAuthUser, createDashboardClient } from '@/lib/xxiv/server-client';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  addCFCustomDomain,
  deleteCFProject,
  getCFDomainStatus,
  removeCFCustomDomain,
} from '@/lib/xxiv/cloudflare-pages';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function getUserSites() {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();

  const { data, error } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSiteById(siteId: string) {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();

  const { data, error } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('id', siteId)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function createSite(formData: FormData) {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();
  const admin = await getSupabaseAdmin();

  if (!admin) {
    throw new Error('Supabase not configured');
  }

  const name = formData.get('name') as string;
  if (!name?.trim()) {
    throw new Error('Site name is required');
  }

  // Generate unique slug
  const baseSlug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  // Create XXIV site record first (so we can tag pages with xxiv_site_id)
  const { data: site, error: siteError } = await supabase
    .from('xxiv_sites')
    .insert({
      name,
      slug,
      user_id: user.id,
      plan: 'free', // dev default
      page_folder_id: null,
      home_page_id: null,
      is_published: false,
      publish_status: 'unpublished',
    })
    .select()
    .single();

  if (siteError) throw siteError;

  // Create home page in Ycode (no folder)
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
    layers: [],
    is_published: false,
  });

  // Update XXIV site with home page
  const { error: updateSiteError } = await supabase
    .from('xxiv_sites')
    .update({
      home_page_id: page.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', site.id);

  if (updateSiteError) throw updateSiteError;

  // Keep dashboard list fresh if user navigates back
  revalidatePath('/dashboard');

  // Go directly to Ycode editor
  redirect('/ycode/pages/' + page.id + '?xxiv_site_id=' + site.id);
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
    .eq('user_id', user.id)
    .single();

  if (siteError) throw siteError;
  if (!site) throw new Error('Site not found');

  if (site.cf_project_name) {
    await deleteCFProject(site.cf_project_name);
  }

  // Delete all Ycode pages belonging to this site (tagged in settings)
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
    .eq('user_id', user.id)
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
    .eq('user_id', user.id)
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
    .eq('user_id', user.id)
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
    .eq('user_id', user.id)
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
    .eq('user_id', user.id)
    .single();

  if (error) throw error;

  if (!site?.home_page_id) {
    throw new Error('No page found for this site');
  }

  redirect('/ycode/pages/' + site.home_page_id + '?xxiv_site_id=' + siteId);
}
