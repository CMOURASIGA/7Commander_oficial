alter table if exists risks
  add column if not exists decision_id uuid references decisions(id) on delete set null,
  add column if not exists task_id uuid references tasks(id) on delete set null;

create index if not exists idx_risks_decision_id on risks(decision_id);
create index if not exists idx_risks_task_id on risks(task_id);
