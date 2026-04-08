'use server';

import { requireAuthUser, createDashboardClient } from '@/lib/xxiv/server-client';
import { getSupabaseAdmin } from '@/lib/supabase-server';
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

  // Check plan limits
  const { count, error: countError } = await supabase
    .from('xxiv_sites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) throw countError;

  // Free plan: max 1 site
  if ((count || 0) >= 1) {
    throw new Error('PLAN_LIMIT: Upgrade to create more sites');
  }

  // Generate unique slug
  const baseSlug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  // Create page_folder in Ycode
  const { data: folder, error: folderError } = await admin
    .from('page_folders')
    .insert({
      name: name,
      slug: slug,
      depth: 0,
      order: 0,
      is_published: false,
      settings: {},
    })
    .select()
    .single();

  if (folderError) throw folderError;

  // Create home page in Ycode
  const { data: page, error: pageError } = await admin
    .from('pages')
    .insert({
      name: 'Home',
      slug: 'home',
      page_folder_id: folder.id,
      is_index: true,
      is_dynamic: false,
      depth: 0,
      order: 0,
      is_published: false,
      settings: {},
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

  // Create XXIV site record
  const { data: site, error: siteError } = await supabase
    .from('xxiv_sites')
    .insert({
      name,
      slug,
      user_id: user.id,
      plan: 'free',
      page_folder_id: folder.id,
      home_page_id: page.id,
      is_published: false,
    })
    .select()
    .single();

  if (siteError) throw siteError;

  // Keep dashboard list fresh if user navigates back
  revalidatePath('/dashboard');

  // Go directly to Ycode editor
  redirect('/ycode/pages/' + site.home_page_id);
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

  // Delete Ycode pages and layers
  if (site.home_page_id) {
    await admin.from('page_layers').delete().eq('page_id', site.home_page_id);

    await admin.from('pages').delete().eq('page_folder_id', site.page_folder_id);
  }

  // Delete page folder
  if (site.page_folder_id) {
    await admin.from('page_folders').delete().eq('id', site.page_folder_id);
  }

  // Delete XXIV site (RLS enforces ownership)
  const { error: deleteError } = await supabase.from('xxiv_sites').delete().eq('id', siteId);
  if (deleteError) throw deleteError;

  revalidatePath('/dashboard');
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

  redirect('/ycode/pages/' + site.home_page_id);
}
