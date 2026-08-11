-- 7Commander platform administration, licensing and tenant branding

alter table organizations add column if not exists legal_name text;
alter table organizations add column if not exists tax_id text;
alter table organizations add column if not exists email text;
alter table organizations add column if not exists phone text;
alter table organizations add column if not exists address jsonb not null default '{}'::jsonb;
alter table organizations add column if not exists contract_contact jsonb not null default '{}'::jsonb;
alter table organizations add column if not exists plan text not null default 'professional';
alter table organizations add column if not exists contract_start date;
alter table organizations add column if not exists contract_end date;
alter table organizations add column if not exists billing_day integer check (billing_day between 1 and 31);
alter table organizations add column if not exists licensed_users integer not null default 10 check (licensed_users > 0);
alter table organizations add column if not exists quotas jsonb not null default '{}'::jsonb;
alter table organizations add column if not exists branding jsonb not null default '{"displayName":"7Commander","primaryColor":"#2563eb","secondaryColor":"#0f172a"}'::jsonb;
alter table organizations add column if not exists notes text;

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'superadmin' check (role in ('superadmin','support','billing')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists organization_modules (
  organization_id uuid not null references organizations(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, module_key)
);

create table if not exists platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from platform_admins where user_id = auth.uid() and active);
$$;

alter table platform_admins enable row level security;
alter table organization_modules enable row level security;
alter table platform_audit_log enable row level security;

drop policy if exists platform_admins_self_read on platform_admins;
create policy platform_admins_self_read on platform_admins for select using (user_id = auth.uid());
drop policy if exists organization_modules_tenant_read on organization_modules;
create policy organization_modules_tenant_read on organization_modules for select
  using (public.is_organization_member(organization_id) or public.is_platform_admin());
drop policy if exists platform_audit_admin_read on platform_audit_log;
create policy platform_audit_admin_read on platform_audit_log for select using (public.is_platform_admin());

-- Platform administrators are granted explicitly after the migration.
-- Never infer privileged access from account creation order.
