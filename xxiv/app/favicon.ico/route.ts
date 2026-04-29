import { NextResponse } from 'next/server';

const ONE_DAY = 60 * 60 * 24;

export function GET() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': `public, max-age=${ONE_DAY}, stale-while-revalidate=${ONE_DAY}`,
    },
  });
}
