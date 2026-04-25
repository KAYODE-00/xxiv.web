import { NextRequest } from 'next/server';
import { noCache } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'nature';
  const page = searchParams.get('page') || '1';
  const perPage = searchParams.get('per_page') || '20';
  const orientation = searchParams.get('orientation') || 'landscape';

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return noCache(
      { error: 'Unsplash not configured. Add UNSPLASH_ACCESS_KEY to .env' },
      503
    );
  }

  const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=${orientation}`;
  const response = await fetch(unsplashUrl, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return noCache(
      { error: 'Unsplash API error' },
      response.status
    );
  }

  const data = await response.json();
  const photos = Array.isArray(data.results)
    ? data.results.map((photo: any) => ({
        id: photo.id,
        thumb: photo.urls.small,
        regular: photo.urls.regular,
        full: photo.urls.full,
        photographer: photo.user?.name || 'Unknown',
        photographerUrl: photo.user?.links?.html || 'https://unsplash.com',
        altDescription: photo.alt_description || photo.description || 'Unsplash photo',
        width: photo.width,
        height: photo.height,
        color: photo.color,
      }))
    : [];

  return noCache({
    photos,
    total: data.total || 0,
    totalPages: data.total_pages || 0,
  });
}
