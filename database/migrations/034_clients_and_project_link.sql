create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  descricao text,
  contato text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_user_id on clients(user_id);
create index if not exists idx_clients_user_status on clients(user_id, status);

alter table if exists projects
  add column if not exists client_id uuid references clients(id) on delete set null;

create index if not exists idx_projects_client_id on projects(client_id);
