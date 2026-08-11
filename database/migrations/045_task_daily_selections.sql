-- Seleção pessoal de cards que compõem a Daily do operador.
create table if not exists task_daily_selections (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null,
  project_id uuid references projects(id) on delete cascade,
  selected_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index if not exists idx_task_daily_selections_user
  on task_daily_selections(user_id, selected_at desc);
