import { NextRequest, NextResponse } from 'next/server';
import { getSettingByKey, setSetting } from '@/lib/repositories/settingsRepository';

/**
 * GET /xxiv/api/settings/email
 *
 * Load saved email settings from the generic settings table.
 */
export async function GET() {
  try {
    const value = await getSettingByKey('email');

    return NextResponse.json({
      data: value,
    });
  } catch (error) {
    console.error('[API] Error loading email settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load email settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /xxiv/api/settings/email
 *
 * Persist email settings to the generic settings table.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const value = body?.value;

    if (!value || typeof value !== 'object') {
      return NextResponse.json(
        { error: 'A settings payload is required' },
        { status: 400 }
      );
    }

    const saved = await setSetting('email', value);

    return NextResponse.json({
      data: saved.value,
      message: 'Email settings saved',
    });
  } catch (error) {
    console.error('[API] Error saving email settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save email settings' },
      { status: 500 }
    );
  }
}
