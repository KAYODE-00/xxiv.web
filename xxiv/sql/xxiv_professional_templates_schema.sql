create extension if not exists pgcrypto;

create table if not exists public.xxiv_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  category text not null default 'Other',
  thumbnail_url text null,
  preview_url text null,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xxiv_template_pages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.xxiv_templates(id) on delete cascade,
  name text not null,
  slug text not null default '',
  is_index boolean not null default false,
  page_order integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xxiv_template_layers (
  id uuid primary key default gen_random_uuid(),
  template_page_id uuid not null references public.xxiv_template_pages(id) on delete cascade,
  layers jsonb not null default '[]'::jsonb,
  generated_css text null,
  created_at timestamptz not null default now()
);

create table if not exists public.xxiv_builder_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  type text not null,
  category text not null default 'Other',
  preview_image_url text null,
  source text not null default 'user',
  tags text[] not null default '{}',
  template jsonb not null,
  is_system boolean not null default false,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'xxiv_builder_templates_type_check'
  ) then
    alter table public.xxiv_builder_templates
      add constraint xxiv_builder_templates_type_check
      check (type in ('layout', 'element'));
  end if;
end $$;

create index if not exists idx_xxiv_templates_category_published_sort
  on public.xxiv_templates(category, is_published, sort_order);

create index if not exists idx_xxiv_templates_featured_published
  on public.xxiv_templates(is_featured, is_published);

create index if not exists idx_xxiv_template_pages_template_order
  on public.xxiv_template_pages(template_id, page_order);

create index if not exists idx_xxiv_template_layers_template_page
  on public.xxiv_template_layers(template_page_id);

create index if not exists idx_xxiv_builder_templates_type_category_sort
  on public.xxiv_builder_templates(type, category, sort_order);

create index if not exists idx_xxiv_builder_templates_published_deleted
  on public.xxiv_builder_templates(is_published, deleted_at);

alter table public.xxiv_templates enable row level security;
alter table public.xxiv_template_pages enable row level security;
alter table public.xxiv_template_layers enable row level security;
alter table public.xxiv_builder_templates enable row level security;

drop policy if exists "Public can view published xxiv templates" on public.xxiv_templates;
create policy "Public can view published xxiv templates"
on public.xxiv_templates for select
using (is_published = true);

drop policy if exists "Public can view xxiv template pages" on public.xxiv_template_pages;
create policy "Public can view xxiv template pages"
on public.xxiv_template_pages for select
using (
  exists (
    select 1
    from public.xxiv_templates
    where public.xxiv_templates.id = public.xxiv_template_pages.template_id
      and public.xxiv_templates.is_published = true
  )
);

drop policy if exists "Public can view xxiv template layers" on public.xxiv_template_layers;
create policy "Public can view xxiv template layers"
on public.xxiv_template_layers for select
using (
  exists (
    select 1
    from public.xxiv_template_pages
    join public.xxiv_templates
      on public.xxiv_templates.id = public.xxiv_template_pages.template_id
    where public.xxiv_template_pages.id = public.xxiv_template_layers.template_page_id
      and public.xxiv_templates.is_published = true
  )
);

drop policy if exists "Public can view published builder templates" on public.xxiv_builder_templates;
create policy "Public can view published builder templates"
on public.xxiv_builder_templates for select
using (is_published = true and deleted_at is null);

drop policy if exists "Authenticated users can modify builder templates" on public.xxiv_builder_templates;
create policy "Authenticated users can modify builder templates"
on public.xxiv_builder_templates for all
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);
