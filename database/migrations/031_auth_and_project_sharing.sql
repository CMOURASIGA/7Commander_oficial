-- US-031 / US-032
-- Autenticacao de identidade e compartilhamento por projeto

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text unique,
  nome text,
  avatar_url text,
  provider text not null default 'google',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists email text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists provider text not null default 'google';
alter table profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_profiles_email on profiles(email) where email is not null;

create or replace function touch_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_profiles_updated_at on profiles;
create trigger trg_touch_profiles_updated_at
before update on profiles
for each row execute function touch_profiles_updated_at();

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  member_user_id uuid,
  member_email text not null,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'revoked')),
  invited_by uuid,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, member_email)
);

create table if not exists project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  invite_email text not null,
  role text not null check (role in ('editor', 'viewer')),
  invited_by uuid not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_permissions (
  role text primary key check (role in ('owner', 'editor', 'viewer')),
  can_manage_project boolean not null default false,
  can_edit_project boolean not null default false,
  can_manage_members boolean not null default false,
  can_manage_tasks boolean not null default false,
  can_manage_decisions boolean not null default false,
  can_manage_knowledge boolean not null default false,
  created_at timestamptz not null default now()
);

insert into project_permissions (
  role,
  can_manage_project,
  can_edit_project,
  can_manage_members,
  can_manage_tasks,
  can_manage_decisions,
  can_manage_knowledge
)
values
  ('owner', true, true, true, true, true, true),
  ('editor', false, true, false, true, true, true),
  ('viewer', false, false, false, false, false, false)
on conflict (role) do nothing;

create index if not exists idx_profiles_user on profiles(user_id);
create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_user on project_members(member_user_id);
create index if not exists idx_project_members_email on project_members(member_email);
create index if not exists idx_project_invites_project on project_invites(project_id);
create index if not exists idx_project_invites_email on project_invites(invite_email);
