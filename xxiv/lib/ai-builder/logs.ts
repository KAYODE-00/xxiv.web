import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { AiBuilderInputType, AiBuilderLogStatus, AiBuilderSitePlan } from '@/lib/ai-builder/types';

export async function createAiBuilderLog(params: {
  projectId: string;
  userId: string;
  inputType: AiBuilderInputType;
  status: AiBuilderLogStatus;
  sitePlan?: AiBuilderSitePlan | null;
  error?: string | null;
}) {
  const client = await getSupabaseAdmin();
  if (!client) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await client
    .from('ai_builder_logs')
    .insert({
      project_id: params.projectId,
      user_id: params.userId,
      input_type: params.inputType,
      status: params.status,
      site_plan: params.sitePlan ?? null,
      error: params.error ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create AI builder log: ${error.message}`);
  }

  return data.id as string;
}

export async function updateAiBuilderLog(
  logId: string,
  updates: Partial<{
    status: AiBuilderLogStatus;
    sitePlan: AiBuilderSitePlan | null;
    error: string | null;
  }>,
) {
  const client = await getSupabaseAdmin();
  if (!client) {
    throw new Error('Supabase not configured');
  }

  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.sitePlan !== undefined) payload.site_plan = updates.sitePlan;
  if (updates.error !== undefined) payload.error = updates.error;

  const { error } = await client
    .from('ai_builder_logs')
    .update(payload)
    .eq('id', logId);

  if (error) {
    throw new Error(`Failed to update AI builder log: ${error.message}`);
  }
}
