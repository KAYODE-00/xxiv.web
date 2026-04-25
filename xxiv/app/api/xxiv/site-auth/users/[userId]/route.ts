import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/xxiv/server-client';
import { updateSiteUser } from '@/lib/xxiv/site-auth-service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { userId } = await params;
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');
  const body = await request.json().catch(() => ({}));

  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const action = body?.action === 'delete' ? 'delete' : undefined;
  const isActive = typeof body?.is_active === 'boolean' ? body.is_active : undefined;

  const result = await updateSiteUser(userId, siteId, user.id, {
    action,
    is_active: isActive,
  });

  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}
