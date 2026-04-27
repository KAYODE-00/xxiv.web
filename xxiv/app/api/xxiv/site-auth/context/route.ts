import { NextResponse } from 'next/server';
import { getCurrentXxivSiteContext } from '@/lib/xxiv/site-context';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId =
    searchParams.get('site_id')
    || searchParams.get('xxiv_site_id')
    || null;

  const site = await getCurrentXxivSiteContext(siteId);

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  return NextResponse.json({ data: site });
}
