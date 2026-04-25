import { NextResponse } from 'next/server';
import { getCurrentXxivSiteContext } from '@/lib/xxiv/site-context';

export async function GET() {
  const site = await getCurrentXxivSiteContext();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  return NextResponse.json({ data: site });
}
