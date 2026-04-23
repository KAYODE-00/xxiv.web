import { NextRequest, NextResponse } from 'next/server';
import { setSettings } from '@/lib/repositories/settingsRepository';
import { clearAllCache } from '@/lib/services/cacheService';

import { getAuthUser } from '@/lib/xxiv/server-client';

/**
 * PUT /xxiv/api/settings/batch
 *
 * Update multiple settings at once.
 * Invalidates the public page cache so ISR pages pick up the new values.
 * Request body: { settings: { key1: value1, key2: value2, ... } }
 */
export async function PUT(request: NextRequest) {
  let body: any = null;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await request.json();
    const { siteId, settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid settings object in request body' },
        { status: 400 }
      );
    }

    const count = await setSettings(settings);

    try {
      await clearAllCache();
    } catch (cacheError) {
      console.error('[API Batch Settings] Cache clear failed:', cacheError);
    }

    return NextResponse.json({
      data: { count },
      message: `Updated ${count} setting(s) successfully`,
    });
  } catch (error) {
    const settingKeys = body?.settings && typeof body.settings === 'object'
      ? Object.keys(body.settings)
      : [];

    console.error('[API Batch Settings] Request Body:', body);
    console.error('[API Batch Settings] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update settings',
        details: settingKeys.length > 0 ? `keys: ${settingKeys.join(', ')}` : undefined,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
