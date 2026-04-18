import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { noCache } from '@/lib/api-response';

/**
 * POST /xxiv/api/auth/invite
 *
 * Invite a user by email using Supabase's built-in invite system.
 * This version is a clean rewrite to resolve persistent build cache issues.
 */
export async function POST(request: NextRequest) {
  try {
    const { email: inviteEmail, redirectTo, xxiv_site_id } = await request.json();

    if (!inviteEmail) {
      return noCache({ error: 'Email is required' }, 400);
    }

    const client = await getSupabaseAdmin();
    if (!client) {
      return noCache({ error: 'Supabase not configured' }, 500);
    }

    // Get the current user to identify the inviter
    const { getAuthUser } = await import('@/lib/xxiv/server-client');
    const inviter = await getAuthUser();

    if (!inviter) {
      return noCache({ error: 'Unauthorized' }, 401);
    }

    // Record invitation in the database (PER PROJECT)
    if (xxiv_site_id) {
      const { error: dbError } = await client
        .from('xxiv_site_invites')
        .upsert({
          site_id: xxiv_site_id,
          email: inviteEmail.trim(),
          inviter_id: inviter.id,
          status: 'pending',
          created_at: new Date().toISOString()
        }, { onConflict: 'site_id, email' });

      if (dbError) {
        console.error('[invite] DB error:', dbError);
        return noCache({ error: 'Failed' }, 500);
      }
    }

    // Use Supabase's built-in invite functionality
    const { data, error } = await client.auth.admin.inviteUserByEmail(inviteEmail, {
      redirectTo: redirectTo || undefined,
      data: {
        invited_at: new Date().toISOString(),
        xxiv_site_id: xxiv_site_id || null, 
      },
    });

    if (error && error.status !== 422) {
      console.error('[invite] Supabase error:', error);
      return noCache({ error: error.message }, 400);
    }

    return noCache({
      data: {
        user: data?.user || null,
        message: `Invitation sent to ${inviteEmail}`,
      },
    });
  } catch (err) {
    console.error('[invite] Unexpected error:', err);
    return noCache({ error: 'Internal Server Error' }, 500);
  }
}
// Clean Fresh Start: 2026-04-19 00:39
