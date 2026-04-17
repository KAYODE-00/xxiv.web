import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { Layer, PageSettings } from '@/types';

export interface XxivTemplateRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  preview_url: string | null;
  tags: string[];
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface XxivTemplatePageRecord {
  id: string;
  template_id: string;
  name: string;
  slug: string;
  is_index: boolean;
  page_order: number;
  settings: PageSettings;
  created_at: string;
  updated_at: string;
}

export interface XxivTemplateLayerRecord {
  id: string;
  template_page_id: string;
  layers: Layer[];
  generated_css: string | null;
  created_at: string;
}

export interface TemplateFilters {
  category?: string;
  query?: string;
  featuredOnly?: boolean;
  publishedOnly?: boolean;
  limit?: number;
}

async function getClient() {
  const client = await getSupabaseAdmin();

  if (!client) {
    throw new Error('Supabase not configured');
  }

  return client;
}

export async function getTemplates(filters: TemplateFilters = {}): Promise<XxivTemplateRecord[]> {
  const client = await getClient();
  const {
    category,
    query,
    featuredOnly = false,
    publishedOnly = true,
    limit,
  } = filters;

  let supabaseQuery = client
    .from('xxiv_templates')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (publishedOnly) {
    supabaseQuery = supabaseQuery.eq('is_published', true);
  }

  if (featuredOnly) {
    supabaseQuery = supabaseQuery.eq('is_featured', true);
  }

  if (category && category !== 'All') {
    supabaseQuery = supabaseQuery.eq('category', category);
  }

  if (query?.trim()) {
    const sanitized = query.replace(/[%_]/g, '').trim();
    supabaseQuery = supabaseQuery.or(
      `name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,category.ilike.%${sanitized}%,tags.cs.{${sanitized}}`
    );
  }

  if (typeof limit === 'number') {
    supabaseQuery = supabaseQuery.limit(limit);
  }

  const { data, error } = await supabaseQuery;

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  return (data || []) as XxivTemplateRecord[];
}

export async function getTemplateBySlug(slug: string): Promise<XxivTemplateRecord | null> {
  const client = await getClient();
  const { data, error } = await client
    .from('xxiv_templates')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch template: ${error.message}`);
  }

  return data as XxivTemplateRecord;
}

export async function getTemplateById(id: string): Promise<XxivTemplateRecord | null> {
  const client = await getClient();
  const { data, error } = await client
    .from('xxiv_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch template: ${error.message}`);
  }

  return data as XxivTemplateRecord;
}

export async function getTemplatePages(templateId: string): Promise<XxivTemplatePageRecord[]> {
  const client = await getClient();
  const { data, error } = await client
    .from('xxiv_template_pages')
    .select('*')
    .eq('template_id', templateId)
    .order('page_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch template pages: ${error.message}`);
  }

  return (data || []) as XxivTemplatePageRecord[];
}

export async function getTemplateLayers(templatePageIds: string[]): Promise<XxivTemplateLayerRecord[]> {
  if (templatePageIds.length === 0) {
    return [];
  }

  const client = await getClient();
  const { data, error } = await client
    .from('xxiv_template_layers')
    .select('*')
    .in('template_page_id', templatePageIds);

  if (error) {
    throw new Error(`Failed to fetch template layers: ${error.message}`);
  }

  return (data || []) as XxivTemplateLayerRecord[];
}
