import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { LayerTemplate } from '@/types';

export interface BuilderTemplateRecord {
  id: string;
  key: string;
  name: string;
  type: 'layout' | 'element';
  category: string;
  preview_image_url: string | null;
  source: string;
  tags: string[];
  template: LayerTemplate;
  is_system: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateBuilderTemplateData {
  key: string;
  name: string;
  type: 'layout' | 'element';
  category: string;
  preview_image_url?: string | null;
  source?: string;
  tags?: string[];
  template: LayerTemplate;
  is_system?: boolean;
  is_published?: boolean;
  sort_order?: number;
}

export interface UpdateBuilderTemplateData {
  key?: string;
  name?: string;
  category?: string;
  preview_image_url?: string | null;
  tags?: string[];
  template?: LayerTemplate;
  is_published?: boolean;
  sort_order?: number;
}

async function getClient() {
  const client = await getSupabaseAdmin();
  if (!client) {
    throw new Error('Supabase not configured');
  }
  return client;
}

export async function listBuilderTemplates(type?: 'layout' | 'element'): Promise<BuilderTemplateRecord[]> {
  const client = await getClient();
  let query = client
    .from('xxiv_builder_templates')
    .select('*')
    .is('deleted_at', null)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list builder templates: ${error.message}`);
  }

  return (data || []) as BuilderTemplateRecord[];
}

export async function getBuilderTemplateById(id: string): Promise<BuilderTemplateRecord | null> {
  const client = await getClient();
  const { data, error } = await client
    .from('xxiv_builder_templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch builder template: ${error.message}`);
  }

  return data as BuilderTemplateRecord;
}

export async function getBuilderTemplateByKey(key: string): Promise<BuilderTemplateRecord | null> {
  const client = await getClient();
  const { data, error } = await client
    .from('xxiv_builder_templates')
    .select('*')
    .eq('key', key)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch builder template by key: ${error.message}`);
  }

  return data as BuilderTemplateRecord;
}

export async function createBuilderTemplate(input: CreateBuilderTemplateData): Promise<BuilderTemplateRecord> {
  const client = await getClient();
  const { data, error } = await client
    .from('xxiv_builder_templates')
    .insert({
      key: input.key,
      name: input.name,
      type: input.type,
      category: input.category,
      preview_image_url: input.preview_image_url || null,
      source: input.source || 'user',
      tags: input.tags || [],
      template: input.template,
      is_system: input.is_system || false,
      is_published: input.is_published ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create builder template: ${error.message}`);
  }

  return data as BuilderTemplateRecord;
}

export async function updateBuilderTemplate(id: string, updates: UpdateBuilderTemplateData): Promise<BuilderTemplateRecord> {
  const client = await getClient();
  const { data, error } = await client
    .from('xxiv_builder_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update builder template: ${error.message}`);
  }

  return data as BuilderTemplateRecord;
}

export async function softDeleteBuilderTemplate(id: string): Promise<void> {
  const client = await getClient();
  const { error } = await client
    .from('xxiv_builder_templates')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to delete builder template: ${error.message}`);
  }
}
