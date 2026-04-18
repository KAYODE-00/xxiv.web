import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { noCache } from '@/lib/api-response';

/**
 * GET /xxiv/api/auth/users
 *
 * List all users with their status (active or pending invite)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('xxiv_site_id');

    if (!siteId) {
       // For backwards compatibility or dashboard, return all if no siteId? 
       // Actually, XXIV prefers isolation. Let's return error if siteId is missing.
       return noCache({ error: 'Site ID is required' }, 400);
    }

    const client = await getSupabaseAdmin();
    if (!client) {
      return noCache({ error: 'Supabase not configured' }, 500);
    }

    // 1. Get site owner
    const { data: site } = await client
      .from('xxiv_sites')
      .select('user_id')
      .eq('id', siteId)
      .single();

    // 2. Get site members
    const { data: members } = await client
      .from('xxiv_site_members')
      .select('user_id')
      .eq('site_id', siteId);

    // 3. Get pending invites
    const { data: invites } = await client
      .from('xxiv_site_invites')
      .select('id, email, created_at')
      .eq('site_id', siteId)
      .eq('status', 'pending');

    const allowedUserIds = new Set<string>();
    if (site?.user_id) allowedUserIds.add(site.user_id);
    members?.forEach(m => allowedUserIds.add(m.user_id));

    // 4. Fetch all users from Supabase Auth to get metadata
    // (Filtering in Auth API by IDs is limited, so we fetch and filter manually)
    const { data: authData, error: authError } = await client.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      console.error('[users] Error listing users:', authError);
      return noCache({ error: authError.message }, 500);
    }

    const activeUsers: any[] = [];
    const pendingInvites: any[] = [];

    // Filter Auth users based on site membership
    for (const user of authData.users) {
      if (allowedUserIds.has(user.id)) {
        const metadata = user.user_metadata || (user as any).raw_user_meta_data || {};
        activeUsers.push({
          id: user.id,
          email: user.email || '',
          display_name: metadata.display_name || metadata.full_name || null,
          avatar_url: metadata.avatar_url || null,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
        });
      }
    }

    // Add pending invites from the site_invites table
    invites?.forEach(invite => {
      pendingInvites.push({
        id: invite.id,
        email: invite.email,
        invited_at: invite.created_at,
      });
    });

    return noCache({
      data: {
        activeUsers,
        pendingInvites,
      },
    });
  } catch (error) {
    console.error('[users] Unexpected error:', error);
    return noCache({ error: 'Failed to fetch users' }, 500);
  }
}

/**
 * DELETE /xxiv/api/auth/users
 *
 * Delete a user or cancel a pending invite
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const siteId = searchParams.get('xxiv_site_id');

    if (!userId) {
      return noCache({ error: 'User ID is required' }, 400);
    }

    const client = await getSupabaseAdmin();
    if (!client) {
      return noCache({ error: 'Supabase not configured' }, 500);
    }

    if (siteId) {
      // 1. Try to remove from site_members (if it's a registered user)
      const { error: memberError } = await client
        .from('xxiv_site_members')
        .delete()
        .eq('site_id', siteId)
        .eq('user_id', userId);

      // 2. Also try to remove from site_invites (if it's a pending invite)
      // Note: in this case, the 'userId' passed might actually be the invite ID
      const { error: inviteError } = await client
        .from('xxiv_site_invites')
        .delete()
        .eq('id', userId)
        .eq('site_id', siteId);

      return noCache({
        data: { success: true, message: 'User removed from site' },
      });
    }

    // LEGACY / SUPERADMIN: Global delete (only if siteId is omitted)
    const { error } = await client.auth.admin.deleteUser(userId);

    if (error) {
      console.error('[users] Error deleting user:', error);
      return noCache({ error: error.message }, 400);
    }

    return noCache({
      data: { success: true },
    });
  } catch (error) {
    console.error('[users] Unexpected error:', error);
    return noCache({ error: 'Failed to delete user' }, 500);
  }
}
