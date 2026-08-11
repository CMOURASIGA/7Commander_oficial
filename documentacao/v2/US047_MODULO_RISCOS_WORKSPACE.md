# US-047 - Modulo de riscos no workspace do projeto

Data: 2026-05-12
Status: concluido

## Entregas implementadas nesta iteracao

### 1) Persistencia e schema

- Migration criada: `database/migrations/035_risks_owner_and_updated_at.sql`
- Migration complementar criada: `database/migrations/037_risks_links_decisions_tasks.sql`
- Campos adicionados/garantidos no dominio de riscos:
  - `responsavel`
  - `updated_at`
  - `decision_id` (vinculo opcional com decisao)
  - `task_id` (vinculo opcional com tarefa)
- Index operacional por usuario/projeto/status.

### 2) Servico de dominio

- `services/risk-service.ts`
  - listar riscos por projeto
  - listar riscos abertos por usuario
  - criar risco
  - buscar por id
  - atualizar risco

### 3) APIs

- `GET/POST /api/projects/[projectId]/risks`
  - listagem e criacao com controle de permissao por papel
- `PATCH /api/risks/[riskId]`
  - atualizacao de status e campos do risco

### 4) Workspace (UI)

- Tela `app/projects/page.tsx` agora possui:
  - formulario de criacao de risco (impacto, probabilidade, mitigacao, dono, status)
  - campos opcionais de vinculo com decisao/tarefa (`decisionId`, `taskId`)
  - listagem de riscos do projeto ativo
  - atualizacao de status do risco

### 5) Contexto no Daily e Kairos

- `services/daily-service.ts`
  - inclui riscos ativos no resumo diario (campo `risks`)
- `services/kairos-core.ts`
  - inclui bloco `Contexto de riscos` no prompt operacional por projeto
  - inclui comando de sugestao de risco com confirmacao e persistencia:
    - sugerir risco
    - confirmar/criar risco

## Criterios de aceite

- [x] Riscos podem ser criados, atualizados e consultados por projeto.
- [x] Sugestoes de risco criadas automaticamente pelo Kairos com confirmacao persistida.
- [x] Vinculo formal risco <-> decisao/tarefa quando existir.
- [x] Daily e respostas do Kairos refletem riscos ativos.
