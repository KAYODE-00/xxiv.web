import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { noCache } from '@/lib/api-response';

/**
 * POST /xxiv/api/auth/invite
 *
 * Invite a user by email using Supabase's built-in invite system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, redirectTo } = body;

    if (!email) {
      return noCache(
        { error: 'Email is required' },
        400
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return noCache(
        { error: 'Invalid email format' },
        400
      );
    }

    const client = await getSupabaseAdmin();
    if (!client) {
      return noCache({ error: 'Supabase not configured' }, 500);
    }

    // Get the current user to identify the inviter
    const { createClient: createServerClient } = await import('@/lib/supabase-server');
    const supabaseServer = await createServerClient();
    const { data: { user: inviter }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !inviter) {
      return noCache({ error: 'Unauthorized' }, 401);
    }

    const { email, redirectTo, xxiv_site_id } = await request.json();

    if (!email) {
      return noCache({ error: 'Email is required' }, 400);
    }

    // Optional: Verify xxiv_site_id ownership/membership here if needed
    if (xxiv_site_id) {
      // Create or update invitation record in the database
      const { error: dbError } = await client
        .from('xxiv_site_invites')
        .upsert({
          site_id: xxiv_site_id,
          email: email.trim(),
          inviter_id: inviter.id,
          status: 'pending',
          created_at: new Date().toISOString()
        }, { onConflict: 'site_id, email' });

      if (dbError) {
        console.error('[invite] DB error:', dbError);
        return noCache({ error: 'Failed to record invitation' }, 500);
      }
    }

    // Use Supabase's built-in invite functionality
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
      data: {
        invited_at: new Date().toISOString(),
        xxiv_site_id: xxiv_site_id || null, // Include in user metadata for existing user checks
      },
    });

    if (error) {
      // If user already exists, that's okay, they might still need the membership
      if (error.status !== 422) { // 422 is usually "User already registered"
        console.error('[invite] Error inviting user:', error);
        return noCache({ error: error.message }, 400);
      }
    }

    return noCache({
      data: {
        user: data?.user || null,
        message: `Invitation sent to ${email}`,
      },
    });
  } catch (error) {
    console.error('[invite] Unexpected error:', error);
    return noCache(
      { error: 'Failed to send invitation' },
      500
    );
  }
}
