import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/xxiv/server-client';
import { isAdminUser } from '@/lib/xxiv/admin';
import { getImportedTemplates } from '@/lib/services/templateService';
import ManageImportedTemplatesClient from './ManageImportedTemplatesClient';

export const dynamic = 'force-dynamic';

export default async function ManageImportedTemplatesPage() {
  const user = await requireAuthUser();

  if (!isAdminUser(user)) {
    redirect('/dashboard');
  }

  const templates = await getImportedTemplates({ limit: 200 });

  return <ManageImportedTemplatesClient initialTemplates={templates} />;
}
