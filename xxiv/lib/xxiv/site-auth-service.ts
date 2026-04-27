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

type SiteUserMembership = {
  site_id: string;
  user_id: string;
  role: string;
  created_at?: string | null;
};

export async function signupSiteUser(
  siteId: string,
  email: string,
  password: string,
  fullName?: string,
): Promise<{
  user: { id: string; email: string | undefined; full_name: string | null } | null;
  error?: string;
  errorCode?: 'site_not_found' | 'account_exists_same_site' | 'account_exists_other_site' | 'signup_failed';
}> {
  const admin = await getSupabaseAdmin();
  if (!admin) {
    return { user: null, error: 'Supabase not configured', errorCode: 'signup_failed' };
  }

  const { data: site } = await admin
    .from('xxiv_sites')
    .select('id, name, is_published')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return { user: null, error: 'Site not found', errorCode: 'site_not_found' };
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
    const { data: existingMembership } = await admin
      .from('xxiv_site_members')
      .select('site_id, user_id, role')
      .eq('user_id', existingAuthUser.id)
      .eq('site_id', siteId)
      .maybeSingle();

    if (existingMembership?.site_id === siteId && existingMembership.role === 'site_user') {
      return {
        user: null,
        error: 'An account with this email already exists for this site. Log in instead, or use Forgot password if you do not remember the password.',
        errorCode: 'account_exists_same_site',
      };
    }

    const { data: updatedUser, error: updateUserError } = await admin.auth.admin.updateUserById(
      existingAuthUser.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existingAuthUser.user_metadata || {}),
          full_name: fullName || '',
        },
      },
    );

    if (updateUserError || !updatedUser.user) {
      return { user: null, error: updateUserError?.message || 'Signup failed', errorCode: 'signup_failed' };
    }

    const { error: membershipError } = await admin
      .from('xxiv_site_members')
      .upsert({
        site_id: siteId,
        user_id: existingAuthUser.id,
        role: 'site_user',
      }, { onConflict: 'site_id,user_id' });

    if (membershipError) {
      return { user: null, error: 'Failed to create site membership', errorCode: 'signup_failed' };
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
      return { user: null, error: 'Failed to save user profile', errorCode: 'signup_failed' };
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
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('already')) {
      return {
        user: null,
        error: 'An account with this email already exists. Try logging in or use Forgot password.',
        errorCode: 'account_exists_same_site',
      };
    }
    return { user: null, error: authError?.message || 'Signup failed', errorCode: 'signup_failed' };
  }

  const { error: membershipError } = await admin
    .from('xxiv_site_members')
    .insert({
      site_id: siteId,
      user_id: authData.user.id,
      role: 'site_user',
    });

  if (membershipError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { user: null, error: 'Failed to create site membership', errorCode: 'signup_failed' };
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
    await admin
      .from('xxiv_site_members')
      .delete()
      .eq('site_id', siteId)
      .eq('user_id', authData.user.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    return { user: null, error: 'Failed to create profile', errorCode: 'signup_failed' };
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

  const { data: membership } = await admin
    .from('xxiv_site_members')
    .select('site_id, user_id, role, created_at')
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .eq('role', 'site_user')
    .maybeSingle();

  if (!membership) {
    return { valid: false };
  }

  const { data: profile } = await admin
    .from('site_user_profiles')
    .select('full_name, avatar_url, metadata, is_active, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (profile && profile.is_active === false) {
    return { valid: false };
  }

  return {
    valid: true,
    user: {
      id: userId,
      site_id: siteId,
      role: membership.role,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      metadata: (profile?.metadata as Record<string, unknown> | null) ?? null,
      is_active: profile?.is_active ?? true,
      created_at: profile?.created_at || membership.created_at || new Date().toISOString(),
    },
  };
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

  const { data: memberships } = await admin
    .from('xxiv_site_members')
    .select('site_id, user_id, role, created_at')
    .eq('site_id', siteId)
    .eq('role', 'site_user')
    .order('created_at', { ascending: false });

  const memberIds = (memberships || []).map((membership) => membership.user_id);

  const { data: profiles } = memberIds.length > 0
    ? await admin
      .from('site_user_profiles')
      .select('id, full_name, avatar_url, metadata, is_active, created_at')
      .in('id', memberIds)
    : { data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null; metadata: Record<string, unknown> | null; is_active: boolean; created_at: string }> };

  const { data: listedUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const emailById = new Map<string, string | undefined>(
    (listedUsers?.users || []).map((user) => [user.id, user.email]),
  );
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return {
    users: (memberships || []).map((membership) => {
      const profile = profileById.get(membership.user_id);
      return {
        id: membership.user_id,
        site_id: membership.site_id,
        role: membership.role,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        metadata: profile?.metadata ?? null,
        is_active: profile?.is_active ?? true,
        created_at: profile?.created_at || membership.created_at || new Date().toISOString(),
        email: emailById.get(membership.user_id) || null,
      };
    }),
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
    const { error } = await admin
      .from('xxiv_site_members')
      .delete()
      .eq('site_id', siteId)
      .eq('user_id', userId);
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
