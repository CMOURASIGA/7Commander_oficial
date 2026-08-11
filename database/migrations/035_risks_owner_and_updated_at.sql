alter table if exists risks
  add column if not exists responsavel text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_risks_user_project_status on risks(user_id, project_id, status);
