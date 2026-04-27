import { NextResponse } from 'next/server';
import { signupSiteUser } from '@/lib/xxiv/site-auth-service';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const siteId = typeof body?.site_id === 'string' ? body.site_id : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';

  if (!siteId || !email || !password) {
    return NextResponse.json(
      { error: 'site_id, email, and password are required' },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 },
    );
  }

  const result = await signupSiteUser(siteId, email, password, fullName || undefined);

  if (result.error) {
    const status = result.errorCode === 'account_exists_same_site'
      ? 409
      : result.errorCode === 'account_exists_other_site'
        ? 409
        : result.errorCode === 'site_not_found'
          ? 404
          : 422;

    return NextResponse.json(
      { error: result.error, code: result.errorCode || 'signup_failed' },
      { status },
    );
  }

  return NextResponse.json({ success: true, user: result.user });
}
