-- Toda conversa operacional deve permanecer vinculada a um projeto.
alter table if exists conversations
  add column if not exists project_id uuid references projects(id) on delete restrict;

create index if not exists idx_conversations_user_project
  on conversations(user_id, project_id, created_at desc);
