import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/xxiv/server-client';
import ImportTemplatePageClient from './ImportTemplatePageClient';

export const dynamic = 'force-dynamic';

export default async function ImportTemplatePage() {
  await requireAuthUser();

  return <ImportTemplatePageClient />;
}
