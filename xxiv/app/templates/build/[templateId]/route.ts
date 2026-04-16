import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/xxiv/server-client';
import { cloneTemplateToUserSite } from '@/lib/services/templateService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  const user = await getAuthUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const result = await cloneTemplateToUserSite(templateId, user.id);
    revalidatePath('/dashboard');
    return NextResponse.redirect(new URL(result.redirectUrl, request.url));
  } catch (error) {
    const fallbackUrl = new URL('/templates', request.url);
    fallbackUrl.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Failed to build template'
    );
    return NextResponse.redirect(fallbackUrl);
  }
}
