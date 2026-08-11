create table if not exists task_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null default 'Quadro principal',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id)
);

create table if not exists task_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references task_boards(id) on delete cascade,
  column_key text not null check (column_key in ('todo', 'doing', 'done')),
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(board_id, column_key)
);

alter table if exists tasks
  add column if not exists board_id uuid references task_boards(id) on delete set null,
  add column if not exists column_id uuid references task_columns(id) on delete set null,
  add column if not exists position int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_task_boards_project_id on task_boards(project_id);
create index if not exists idx_task_columns_board_id on task_columns(board_id, position);
create index if not exists idx_tasks_board_column_position on tasks(board_id, column_id, position);
create index if not exists idx_tasks_project_status on tasks(project_id, status);
