import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/xxiv/server-client';
import { listSiteUsers } from '@/lib/xxiv/site-auth-service';

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('site_id');

  if (!siteId) {
    return NextResponse.json({ error: 'site_id required' }, { status: 400 });
  }

  const result = await listSiteUsers(siteId, user.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ users: result.users });
}
