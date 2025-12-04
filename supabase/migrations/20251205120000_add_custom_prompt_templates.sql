-- =====================================================
-- Migration: Add custom prompt templates scoped by plan
-- Description: Armazena templates personalizados vinculados a um tipo de plano
-- =====================================================

create table if not exists public.custom_prompt_templates (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  content text not null,
  category text not null,
  keywords text[] default '{}'::text[],
  plan_type text not null check (plan_type in ('basic','pro','premium','enterprise','free','all')),
  is_active boolean not null default true
);

create index if not exists idx_custom_prompt_templates_plan_type
  on public.custom_prompt_templates(plan_type);

create index if not exists idx_custom_prompt_templates_created_by
  on public.custom_prompt_templates(created_by);

alter table public.custom_prompt_templates enable row level security;

-- Atualiza automaticamente o campo updated_at
drop trigger if exists update_custom_prompt_templates_updated_at on public.custom_prompt_templates;
create trigger update_custom_prompt_templates_updated_at
before update on public.custom_prompt_templates
for each row
execute function public.update_updated_at_column();

comment on table public.custom_prompt_templates is
  'Templates personalizados por plano, criados por usuários autenticados.';

