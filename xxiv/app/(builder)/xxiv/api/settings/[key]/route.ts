import { NextRequest, NextResponse } from 'next/server';
import { getSettingByKey, setSetting } from '@/lib/repositories/settingsRepository';
import { clearAllCache } from '@/lib/services/cacheService';
import { getAuthUser } from '@/lib/xxiv/server-client';

/**
 * GET /xxiv/api/settings/[key]
 *
 * Get a setting value by key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const value = await getSettingByKey(key);

    if (value === null) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: value });
  } catch (error) {
    console.error('[API] Error fetching setting:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

/**
 * PUT /xxiv/api/settings/[key]
 *
 * Update a setting value
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  let body: any = null;
  let settingKey: string = 'unknown';
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    settingKey = key;
    body = await request.json();
    const { value } = body;

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Missing value in request body' },
        { status: 400 }
      );
    }

    await setSetting(key, value);

    await clearAllCache();

    return NextResponse.json({
      data: { key, value },
      message: 'Setting updated successfully',
    });
  } catch (error) {
    console.error(`[API Settings ${settingKey}] Request Body:`, body);
    console.error(`[API Settings ${settingKey}] Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update setting',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
