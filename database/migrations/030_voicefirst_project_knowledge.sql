-- Expansao de projeto para arquitetura voice-first
alter table if exists projects
  add column if not exists tags text[],
  add column if not exists contexto text,
  add column if not exists objetivo text,
  add column if not exists stakeholders text,
  add column if not exists maturidade text,
  add column if not exists ativo boolean not null default false;

create index if not exists idx_projects_user_ativo on projects(user_id, ativo);

-- Knowledge layer (conhecimento explicito separado de memoria operacional)
create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references projects(id) on delete set null,
  titulo text not null,
  categoria text not null default 'geral',
  fonte text not null default 'manual',
  conteudo text not null,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  knowledge_id uuid not null references knowledge_base(id) on delete cascade,
  user_id uuid not null,
  project_id uuid references projects(id) on delete set null,
  chunk_index int not null default 0,
  conteudo text not null,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references knowledge_chunks(id) on delete cascade,
  user_id uuid not null,
  project_id uuid references projects(id) on delete set null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_base_user_project on knowledge_base(user_id, project_id);
create index if not exists idx_knowledge_chunks_user_project on knowledge_chunks(user_id, project_id);
create index if not exists idx_knowledge_embeddings_user_project on knowledge_embeddings(user_id, project_id);
create index if not exists idx_knowledge_embeddings_hnsw
  on knowledge_embeddings using hnsw (embedding vector_cosine_ops);

-- Entidades operacionais adicionais
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references projects(id) on delete set null,
  titulo text not null,
  descricao text,
  prioridade text not null default 'media',
  status text not null default 'aberta',
  responsavel text,
  due_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references projects(id) on delete set null,
  titulo text not null,
  impacto text,
  probabilidade text,
  mitigacao text,
  responsavel text,
  status text not null default 'aberto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_project on tasks(user_id, project_id);
create index if not exists idx_risks_user_project on risks(user_id, project_id);
