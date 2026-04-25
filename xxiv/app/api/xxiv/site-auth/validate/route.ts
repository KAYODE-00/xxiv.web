import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { validateSiteUserSession } from '@/lib/xxiv/site-auth-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');

  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const admin = await getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ valid: false, error: 'Supabase not configured' }, { status: 500 });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await admin.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const result = await validateSiteUserSession(siteId, user.id);
  if (!result.valid || !result.user) {
    return NextResponse.json(
      { valid: false, error: 'No account found for this site' },
      { status: 403 },
    );
  }

  return NextResponse.json({
    valid: true,
    user: {
      ...result.user,
      email: user.email,
    },
  });
}
