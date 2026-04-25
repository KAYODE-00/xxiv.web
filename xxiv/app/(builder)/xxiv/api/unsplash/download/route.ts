import { NextRequest } from 'next/server';
import { noCache } from '@/lib/api-response';
import { uploadFile } from '@/lib/file-upload';

function getFileExtension(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('avif')) return 'avif';
  return 'jpg';
}

function sanitizeFilename(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'unsplash-image';
}

export async function POST(request: NextRequest) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return noCache(
      { error: 'Unsplash not configured. Add UNSPLASH_ACCESS_KEY to .env' },
      503
    );
  }

  try {
    const body = await request.json();
    const {
      photoUrl,
      altDescription,
      unsplashId,
      assetFolderId,
    } = body as {
      photoUrl?: string;
      altDescription?: string;
      unsplashId?: string;
      assetFolderId?: string | null;
    };

    if (!photoUrl || !unsplashId) {
      return noCache({ error: 'photoUrl and unsplashId are required' }, 400);
    }

    await fetch(`https://api.unsplash.com/photos/${unsplashId}/download`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
      cache: 'no-store',
    });

    const imageResponse = await fetch(photoUrl, { cache: 'no-store' });
    if (!imageResponse.ok) {
      return noCache({ error: 'Failed to fetch image from Unsplash' }, 500);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const extension = getFileExtension(contentType);
    const filename = `${sanitizeFilename(altDescription || `unsplash-${unsplashId}`)}.${extension}`;
    const imageBuffer = await imageResponse.arrayBuffer();
    const file = new File([imageBuffer], filename, { type: contentType });

    const asset = await uploadFile(
      file,
      'unsplash',
      filename.replace(/\.[^/.]+$/, ''),
      assetFolderId ?? null
    );

    if (!asset) {
      return noCache({ error: 'Failed to store image in asset library' }, 500);
    }

    return noCache({ asset });
  } catch (error) {
    console.error('Unsplash download error:', error);
    return noCache(
      { error: error instanceof Error ? error.message : 'Failed to download image' },
      500
    );
  }
}
