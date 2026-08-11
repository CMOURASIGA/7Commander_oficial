alter table if exists decisions
  add column if not exists conversation_id uuid references conversations(id) on delete set null,
  add column if not exists artifact_id uuid,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists decision_status_history (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  user_id uuid not null,
  previous_status text check (previous_status in ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  new_status text not null check (new_status in ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  source text not null default 'manual',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_decisions_user_project on decisions(user_id, project_id, created_at desc);
create index if not exists idx_decisions_conversation on decisions(conversation_id);
create index if not exists idx_decision_history_decision on decision_status_history(decision_id, created_at desc);
create index if not exists idx_decision_history_user on decision_status_history(user_id, created_at desc);
