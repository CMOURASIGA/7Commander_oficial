# US-046 - Modulo de decisoes no workspace do projeto

Data: 2026-05-12
Status: concluido

## Entregas implementadas

### 1) Persistencia e vinculos estruturais

- Migration criada:
  - `database/migrations/036_decisions_workspace_links_and_history.sql`
- Campos de decisao adicionados:
  - `project_id` (ja existente e utilizado)
  - `conversation_id` (novo)
  - `artifact_id` (novo)
  - `updated_at` (novo)
- Historico de status implementado:
  - tabela `decision_status_history`

### 2) Servico de decisoes

- `services/decision-service.ts` atualizado para:
  - criar decisao com `projectId`, `conversationId`, `artifactId`
  - listar decisoes por usuario e por projeto
  - atualizar status com registro de historico
  - consultar historico de status por decisao

### 3) APIs

- Global:
  - `GET /api/decisions?projectId=...` (filtro por projeto)
  - `POST /api/decisions` (com vinculos opcionais)
  - `PATCH /api/decisions/[decisionId]/status` (com fonte/nota)
  - `GET /api/decisions/[decisionId]/history`
- Workspace por projeto:
  - `GET /api/projects/[projectId]/decisions`
  - `POST /api/projects/[projectId]/decisions`

### 4) Workspace de projeto (UI)

- `app/projects/page.tsx`:
  - criacao manual de decisao no contexto do projeto ativo
  - listagem de decisoes por projeto
  - alteracao de status da decisao
  - visualizacao de historico de status
  - exibicao de vinculos (`projectId`, `conversationId`, `artifactId`)

### 5) Salvamento via resposta do Kairos

- `app/chat/page.tsx`:
  - ao salvar decisao de resposta do Kairos, envia:
    - `projectId` ativo
    - `conversationId` atual
    - `artifactId` opcional
- Isso gera decisao estruturada com rastreabilidade operacional.

### 6) Decisoes no contexto do Kairos Core

- `services/kairos-core.ts`:
  - passou a incluir bloco `Contexto de decisoes` no prompt por projeto
  - respostas agora consideram decisoes existentes no contexto recuperado

### 7) Validacao tecnica

- Build concluido com sucesso apos implementacao (`npm run build`).

## Criterios de aceite

- [x] Decisoes ficam visiveis por projeto com historico de status.
- [x] Decisao criada pelo Kairos fica auditavel (vinculo + historico de status).
- [x] Respostas do Kairos consideram decisoes existentes no contexto.
