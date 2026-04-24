import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/xxiv/server-client';
import { isAdminUser } from '@/lib/xxiv/admin';
import ImportTemplatePageClient from './ImportTemplatePageClient';

export const dynamic = 'force-dynamic';

export default async function ImportTemplatePage() {
  const user = await requireAuthUser();

  if (!isAdminUser(user)) {
    redirect('/dashboard');
  }

  return <ImportTemplatePageClient />;
}
