-- Personalizacao do comportamento do Kairos por operador.
create table if not exists kairos_profiles (
  user_id uuid primary key,
  instructions text not null default '',
  knowledge text not null default '',
  icebreakers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
