'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthUser } from '@/lib/xxiv/server-client';
import { cloneTemplateToUserSite } from '@/lib/services/templateService';

export async function buildWithTemplate(templateId: string) {
  const user = await requireAuthUser();
  const result = await cloneTemplateToUserSite(templateId, user.id);

  revalidatePath('/dashboard');

  return result;
}
