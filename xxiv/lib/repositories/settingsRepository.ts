/**
 * Settings Repository
 *
 * Data access layer for application settings stored in the database
 */

import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { Setting } from '@/types';
import { resolveSiteScopedStorageKey } from '@/lib/xxiv/site-settings';

async function writeSettingWithoutConflict(
  key: string,
  value: any
): Promise<Setting> {
  const client = await getSupabaseAdmin();
  if (!client) {
    throw new Error('Failed to initialize Supabase client');
  }

  const now = new Date().toISOString();

  const { data: existingRows, error: existingError } = await client
    .from('settings')
    .select('*')
    .eq('key', key)
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to fetch existing setting "${key}": ${existingError.message}`);
  }

  if ((existingRows?.length ?? 0) > 0) {
    const { data: updatedRows, error: updateError } = await client
      .from('settings')
      .update({
        value,
        updated_at: now,
      })
      .eq('key', key)
      .select('*')
      .limit(1);

    if (updateError) {
      throw new Error(`Failed to update setting "${key}": ${updateError.message}`);
    }

    const updated = updatedRows?.[0];
    if (!updated) {
      throw new Error(`Failed to update setting "${key}": no row returned`);
    }

    return updated;
  }

  const { data: inserted, error: insertError } = await client
    .from('settings')
    .insert({
      key,
      value,
      updated_at: now,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to insert setting "${key}": ${insertError.message}`);
  }

  return inserted;
}

/**
 * Get all settings
 *
 * @returns Promise resolving to all settings
 */
export async function getAllSettings(): Promise<Setting[]> {
  const client = await getSupabaseAdmin();
  if (!client) {
    throw new Error('Failed to initialize Supabase client');
  }

  const { data, error } = await client
    .from('settings')
    .select('*')
    .order('key', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a setting by key
 *
 * @param key - The setting key
 * @returns Promise resolving to the setting value or null if not found
 */
export async function getSettingByKey(key: string): Promise<any | null> {
  const client = await getSupabaseAdmin();
  if (!client) {
    throw new Error('Failed to initialize Supabase client');
  }

  const { data, error } = await client
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch setting: ${error.message}`);
  }

  return data?.value || null;
}

/**
 * Get multiple settings by keys in a single query
 *
 * @param keys - Array of setting keys to fetch
 * @returns Promise resolving to a map of key -> value
 */
export async function getSettingsByKeys(keys: string[]): Promise<Record<string, any>> {
  if (keys.length === 0) {
    return {};
  }

  const client = await getSupabaseAdmin();
  if (!client) {
    throw new Error('Failed to initialize Supabase client');
  }

  const { data, error } = await client
    .from('settings')
    .select('key, value')
    .in('key', keys);

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }

  const result: Record<string, any> = {};
  for (const setting of data || []) {
    result[setting.key] = setting.value;
  }

  return result;
}

export async function getScopedSettingByKey(
  key: string,
  siteId?: string | null,
): Promise<any | null> {
  return getSettingByKey(resolveSiteScopedStorageKey(key, siteId));
}

export async function getScopedSettingsByKeys(
  keys: string[],
  siteId?: string | null,
): Promise<Record<string, any>> {
  if (keys.length === 0) {
    return {};
  }

  const storageKeys = keys.map((key) => resolveSiteScopedStorageKey(key, siteId));
  const rawValues = await getSettingsByKeys(storageKeys);
  const result: Record<string, any> = {};

  keys.forEach((key, index) => {
    const storageKey = storageKeys[index];
    if (Object.prototype.hasOwnProperty.call(rawValues, storageKey)) {
      result[key] = rawValues[storageKey];
    }
  });

  return result;
}

/**
 * Set a setting value (insert or update)
 *
 * @param key - The setting key
 * @param value - The value to store
 * @returns Promise resolving to the created/updated setting
 */
export async function setSetting(key: string, value: any): Promise<Setting> {
  return writeSettingWithoutConflict(key, value);
}

export async function setScopedSetting(
  key: string,
  value: any,
  siteId?: string | null,
): Promise<Setting> {
  return setSetting(resolveSiteScopedStorageKey(key, siteId), value);
}

/**
 * Set multiple settings at once (batch upsert)
 * Settings with null/undefined values are deleted instead of upserted.
 *
 * @param settings - Object with key-value pairs to store
 * @returns Promise resolving to the number of settings updated
 */
export async function setSettings(settings: Record<string, any>): Promise<number> {
  const entries = Object.entries(settings);
  if (entries.length === 0) {
    return 0;
  }

  const client = await getSupabaseAdmin();
  if (!client) {
    throw new Error('Failed to initialize Supabase client');
  }

  // Use per-key operations instead of a mixed bulk upsert/delete.
  // This is a little less efficient, but settings writes are tiny and it
  // avoids production-only failures where one incompatible row shape causes
  // the whole batch request to fail.
  for (const [key, value] of entries) {
    if (value === null || value === undefined) {
      const { error } = await client
        .from('settings')
        .delete()
        .eq('key', key);

      if (error) {
        throw new Error(`Failed to delete setting "${key}": ${error.message}`);
      }

      continue;
    }

    await writeSettingWithoutConflict(key, value);
  }

  return entries.length;
}

export async function setScopedSettings(
  settings: Record<string, any>,
  siteId?: string | null,
): Promise<number> {
  const scopedEntries = Object.fromEntries(
    Object.entries(settings).map(([key, value]) => [
      resolveSiteScopedStorageKey(key, siteId),
      value,
    ]),
  );

  return setSettings(scopedEntries);
}
