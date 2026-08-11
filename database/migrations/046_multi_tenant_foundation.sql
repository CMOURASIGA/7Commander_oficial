-- 7Commander multi-tenant foundation
-- Each customer is an organization. Business rows continue using user_id as the
-- tenant data owner for backwards compatibility, while membership and RLS make
-- the isolation explicit and auditable.

create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'manager', 'member')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table profiles add column if not exists active_organization_id uuid references organizations(id) on delete set null;

create index if not exists idx_org_members_user on organization_members(user_id, status);
create index if not exists idx_org_members_org on organization_members(organization_id, status);
create index if not exists idx_org_invites_email on organization_invites(lower(email), status);

create or replace function public.is_organization_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_organization_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_invites enable row level security;
alter table profiles enable row level security;

drop policy if exists organizations_member_read on organizations;
create policy organizations_member_read on organizations for select
  using (public.is_organization_member(id));

drop policy if exists organizations_admin_update on organizations;
create policy organizations_admin_update on organizations for update
  using (public.is_organization_admin(id)) with check (public.is_organization_admin(id));

drop policy if exists organization_members_member_read on organization_members;
create policy organization_members_member_read on organization_members for select
  using (public.is_organization_member(organization_id));

drop policy if exists organization_members_admin_write on organization_members;
create policy organization_members_admin_write on organization_members for all
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

drop policy if exists organization_invites_admin_all on organization_invites;
create policy organization_invites_admin_all on organization_invites for all
  using (public.is_organization_admin(organization_id))
  with check (public.is_organization_admin(organization_id));

drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles for select using (user_id = auth.uid());
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Business tables use the organization UUID in user_id. This preserves the
-- existing service layer while changing its scope from individual to customer.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients','projects','conversations','memories','decisions','decision_status_history',
    'agent_runs','kairos_profiles','knowledge_base','knowledge_chunks','knowledge_embeddings',
    'tasks','risks','integration_logs','integration_executions','task_daily_selections'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists tenant_member_access on public.%I', table_name);
      execute format(
        'create policy tenant_member_access on public.%I for all using (public.is_organization_member(user_id)) with check (public.is_organization_member(user_id))',
        table_name
      );
    end if;
  end loop;
end $$;

-- Child entities inherit tenant isolation through their parent.
do $$
declare
  item record;
begin
  for item in select * from (values
    ('messages','conversation_id','conversations'),
    ('task_boards','project_id','projects'),
    ('task_labels','task_id','tasks'),
    ('task_members','task_id','tasks'),
    ('task_checklists','task_id','tasks'),
    ('task_comments','task_id','tasks'),
    ('task_attachments','task_id','tasks'),
    ('task_activity_log','task_id','tasks'),
    ('project_members','project_id','projects'),
    ('project_invites','project_id','projects')
  ) as x(child_table, foreign_key, parent_table)
  loop
    if to_regclass('public.' || item.child_table) is not null then
      execute format('alter table public.%I enable row level security', item.child_table);
      execute format('drop policy if exists tenant_parent_access on public.%I', item.child_table);
      execute format(
        'create policy tenant_parent_access on public.%I for all using (exists (select 1 from public.%I p where p.id = %I.%I and public.is_organization_member(p.user_id))) with check (exists (select 1 from public.%I p where p.id = %I.%I and public.is_organization_member(p.user_id)))',
        item.child_table, item.parent_table, item.child_table, item.foreign_key,
        item.parent_table, item.child_table, item.foreign_key
      );
    end if;
  end loop;
end $$;
