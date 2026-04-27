import 'server-only';

import { createDashboardClient } from '@/lib/xxiv/server-client';
import { getSupabaseAdmin } from '@/lib/supabase-server';

type SiteUserProfile = {
  id: string;
  site_id: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
};

export async function signupSiteUser(
  siteId: string,
  email: string,
  password: string,
  fullName?: string,
): Promise<{ user: { id: string; email: string | undefined; full_name: string | null } | null; error?: string }> {
  const admin = await getSupabaseAdmin();
  if (!admin) {
    return { user: null, error: 'Supabase not configured' };
  }

  const { data: site } = await admin
    .from('xxiv_sites')
    .select('id, name, is_published')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return { user: null, error: 'Site not found' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: listedUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const existingAuthUser = (listedUsers?.users || []).find(
    (user) => (user.email || '').trim().toLowerCase() === normalizedEmail,
  );

  if (existingAuthUser) {
    const { data: existingProfile } = await admin
      .from('site_user_profiles')
      .select('id, site_id, role')
      .eq('id', existingAuthUser.id)
      .maybeSingle();

    if (existingProfile?.site_id === siteId && existingProfile.role === 'site_user') {
      return { user: null, error: 'An account with this email already exists for this site' };
    }

    if (existingProfile?.site_id && existingProfile.site_id !== siteId) {
      return { user: null, error: 'This email is already registered on another site' };
    }

    const { data: updatedUser, error: updateUserError } = await admin.auth.admin.updateUserById(
      existingAuthUser.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existingAuthUser.user_metadata || {}),
          full_name: fullName || '',
          role: 'site_user',
          site_id: siteId,
        },
      },
    );

    if (updateUserError || !updatedUser.user) {
      return { user: null, error: updateUserError?.message || 'Signup failed' };
    }

    const { error: profileError } = await admin
      .from('site_user_profiles')
      .upsert({
        id: existingAuthUser.id,
        site_id: siteId,
        role: 'site_user',
        full_name: fullName || null,
        metadata: {},
        is_active: true,
      });

    if (profileError) {
      return { user: null, error: 'Failed to create profile' };
    }

    return {
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        full_name: fullName || null,
      },
    };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || '',
      role: 'site_user',
      site_id: siteId,
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('already')) {
      return { user: null, error: 'An account with this email already exists' };
    }
    return { user: null, error: authError?.message || 'Signup failed' };
  }

  const { error: profileError } = await admin
    .from('site_user_profiles')
    .insert({
      id: authData.user.id,
      site_id: siteId,
      role: 'site_user',
      full_name: fullName || null,
      metadata: {},
      is_active: true,
    });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { user: null, error: 'Failed to create profile' };
  }

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email,
      full_name: fullName || null,
    },
  };
}

export async function validateSiteUserSession(
  siteId: string,
  userId: string,
): Promise<{ valid: boolean; user?: SiteUserProfile }> {
  const admin = await getSupabaseAdmin();
  if (!admin) {
    return { valid: false };
  }

  const { data: profile } = await admin
    .from('site_user_profiles')
    .select('*')
    .eq('id', userId)
    .eq('site_id', siteId)
    .eq('role', 'site_user')
    .eq('is_active', true)
    .maybeSingle();

  if (!profile) {
    return { valid: false };
  }

  return { valid: true, user: profile as SiteUserProfile };
}

export async function getValidatedCurrentSiteUser(siteId: string) {
  const supabase = await createDashboardClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const result = await validateSiteUserSession(siteId, user.id);
  if (!result.valid || !result.user) {
    return null;
  }

  return {
    authUser: user,
    profile: result.user,
  };
}

export async function listSiteUsers(siteId: string, builderId: string) {
  const admin = await getSupabaseAdmin();
  if (!admin) {
    return { users: [], error: 'Supabase not configured' };
  }

  const { data: site } = await admin
    .from('xxiv_sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', builderId)
    .maybeSingle();

  if (!site) {
    return { users: [], error: 'Unauthorized' };
  }

  const { data: profiles } = await admin
    .from('site_user_profiles')
    .select('id, site_id, role, full_name, avatar_url, metadata, is_active, created_at')
    .eq('site_id', siteId)
    .eq('role', 'site_user')
    .order('created_at', { ascending: false });

  const { data: listedUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const emailById = new Map<string, string | undefined>(
    (listedUsers?.users || []).map((user) => [user.id, user.email]),
  );

  return {
    users: (profiles || []).map((profile) => ({
      ...profile,
      email: emailById.get(profile.id) || null,
    })),
  };
}

export async function updateSiteUser(
  userId: string,
  siteId: string,
  builderId: string,
  updates: { is_active?: boolean; action?: 'delete' },
) {
  const admin = await getSupabaseAdmin();
  if (!admin) {
    return { error: 'Supabase not configured' };
  }

  const { data: site } = await admin
    .from('xxiv_sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', builderId)
    .maybeSingle();

  if (!site) {
    return { error: 'Unauthorized' };
  }

  if (updates.action === 'delete') {
    const { error } = await admin.auth.admin.deleteUser(userId);
    return error ? { error: error.message } : { success: true };
  }

  const { error } = await admin
    .from('site_user_profiles')
    .update({
      ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('site_id', siteId);

  return error ? { error: error.message } : { success: true };
}
