/**
 * Thumbnail upload utility for component previews
 * Converts image buffers to WebP and uploads to Supabase Storage
 */

import { getSupabaseAdmin } from '@/lib/supabase-server';
import { STORAGE_BUCKET, STORAGE_FOLDERS } from '@/lib/asset-constants';
import sharp from 'sharp';

const UPLOAD_RETRY_DELAYS_MS = [250, 750, 1500];

/**
 * Convert an image buffer to WebP format
 * @param imageBuffer - Raw image buffer (PNG, JPEG, etc.)
 * @param quality - WebP quality 0-100
 * @returns WebP buffer
 */
export async function convertToWebP(imageBuffer: Buffer, quality: number = 85): Promise<Buffer> {
  return sharp(imageBuffer)
    .webp({ quality })
    .toBuffer();
}

function isRetriableStorageError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('bad gateway') ||
    normalized.includes('gateway') ||
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('econnreset') ||
    normalized.includes('socket hang up') ||
    normalized.includes('network')
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadWithRetry(storagePath: string, imageBuffer: Buffer): Promise<string> {
  const client = await getSupabaseAdmin();

  if (!client) {
    throw new Error('Supabase not configured');
  }

  const webpBuffer = await convertToWebP(imageBuffer);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= UPLOAD_RETRY_DELAYS_MS.length; attempt += 1) {
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, webpBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/webp',
      });

    if (!error && data?.path) {
      const { data: urlData } = client.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    }

    lastError = new Error(error?.message || 'Unknown thumbnail upload error');
    if (!isRetriableStorageError(lastError.message) || attempt === UPLOAD_RETRY_DELAYS_MS.length) {
      break;
    }

    await sleep(UPLOAD_RETRY_DELAYS_MS[attempt]);
  }

  throw new Error(`Failed to upload thumbnail: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Upload a component thumbnail to Supabase Storage as WebP
 * Replaces existing thumbnail if present (upsert)
 * @param componentId - Component ID used as filename
 * @param imageBuffer - Raw image buffer (PNG from html-to-image)
 * @returns Public URL of the uploaded thumbnail
 */
export async function uploadThumbnail(componentId: string, imageBuffer: Buffer): Promise<string> {
  const storagePath = `${STORAGE_FOLDERS.COMPONENTS}/${componentId}.webp`;
  return uploadWithRetry(storagePath, imageBuffer);
}

/**
 * Delete a component thumbnail from Supabase Storage
 * @param componentId - Component ID used as filename
 */
export async function deleteThumbnail(componentId: string): Promise<void> {
  const client = await getSupabaseAdmin();

  if (!client) {
    throw new Error('Supabase not configured');
  }

  const storagePath = `${STORAGE_FOLDERS.COMPONENTS}/${componentId}.webp`;

  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete thumbnail: ${error.message}`);
  }
}

export async function uploadTemplateThumbnail(templateId: string, imageBuffer: Buffer): Promise<string> {
  const storagePath = `${STORAGE_FOLDERS.TEMPLATES}/${templateId}.webp`;
  return uploadWithRetry(storagePath, imageBuffer);
}

export async function deleteTemplateThumbnail(templateId: string): Promise<void> {
  const client = await getSupabaseAdmin();

  if (!client) {
    throw new Error('Supabase not configured');
  }

  const storagePath = `${STORAGE_FOLDERS.TEMPLATES}/${templateId}.webp`;
  const { error } = await client.storage.from(STORAGE_BUCKET).remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete template thumbnail: ${error.message}`);
  }
}
