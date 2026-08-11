create table if not exists task_labels (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  name text not null,
  color text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(task_id, name)
);

create table if not exists task_members (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  member_email text not null,
  member_user_id uuid,
  role text not null default 'assignee',
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(task_id, member_email)
);

create table if not exists task_checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references task_checklists(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  content text not null,
  done boolean not null default false,
  position int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_user_id uuid,
  author_email text,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  mime_type text,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists task_activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  actor_user_id uuid,
  actor_email text,
  action_type text not null,
  action_detail text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_labels_task on task_labels(task_id);
create index if not exists idx_task_members_task on task_members(task_id);
create index if not exists idx_task_checklists_task on task_checklists(task_id, position);
create index if not exists idx_task_checklist_items_checklist on task_checklist_items(checklist_id, position);
create index if not exists idx_task_comments_task on task_comments(task_id, created_at desc);
create index if not exists idx_task_attachments_task on task_attachments(task_id, created_at desc);
create index if not exists idx_task_activity_log_task on task_activity_log(task_id, created_at desc);
