# US-002 - Estrategia de migracao incremental V2

Data: 2026-05-12
Status: concluido
Dependencia atendida: US-001 concluida

## 1) Objetivo

Executar a fusao 7C Commander + Kairos em ondas controladas, sem interromper funcoes criticas, com ativacao/desativacao por modulo e plano de rollback objetivo.

## 2) Principios operacionais

- Supabase e a fonte oficial de dados estruturados.
- Google Drive permanece apenas para arquivos fisicos.
- Google Sheets e legado (importacao opcional, sem dependencia operacional).
- Todo rollout deve ter criterio de sucesso, monitoramento e rollback definido antes da ativacao.

## 3) Fases de rollout

### Fase 0 - Baseline e seguranca (concluida)

- Inventario de dependencias Sheets (`US-001`).
- Restauracao da base principal com build valido.
- Exclusao de codigo legado do pipeline de build (`tsconfig`: `backup/`, `v2-foundation/`).

### Fase 1 - Core operacional V2 (em andamento)

- Projetos, membros, chat, memoria, conhecimento e atividades usando Supabase.
- Integracoes observaveis por healthcheck.
- Fluxos principais sem dependencia de planilha.

### Fase 2 - Lacunas funcionais P0

- Clientes (`US-045`).
- Riscos (`US-047`).
- Decisoes completas no workspace (`US-046`).
- Home V2 no padrao 7C (`US-017` e `US-018`).

### Fase 3 - Governanca e homologacao

- Suite E2E ampliada (`US-041`).
- Homologacao integrada (`US-044`).
- Go/No-Go para producao.

## 4) Matriz de ativacao/desativacao por modulo

| Modulo | Ativacao | Desativacao (rollback rapido) | Observacao |
|---|---|---|---|
| Auth obrigatoria | `KAIROS_AUTH_REQUIRED=true` | `KAIROS_AUTH_REQUIRED=false` | Permite fallback controlado em homologacao local |
| Persistencia local fallback | `KAIROS_ENABLE_LOCAL_FALLBACK=true` | `KAIROS_ENABLE_LOCAL_FALLBACK=false` | Em producao manter `false` |
| Projetos V2 | Rotas `app/api/projects/*` + `services/project-service.ts` | Reverter deploy para tag anterior | Dados oficiais seguem no Supabase |
| Atividades/Kanban V2 | Rotas `app/api/projects/[projectId]/tasks` e `app/api/tasks/*` | Reverter deploy; manter schema | Migracoes 032/033 devem permanecer |
| Conhecimento/Ingestao V2 | Rotas `app/api/knowledge*` | Desabilitar rotas via rollback de deploy | Dados persistidos permanecem no Supabase |
| Integracoes externas | Rotas `app/api/integrations/*` e tokens por env | Revogar tokens / desativar chamadas via env | Nao afeta dados core do projeto |

## 5) Separacao de migracao (dados, servicos, telas)

### 5.1 Migracao de dados

- Fonte oficial: Supabase (`database/schema.sql` + migrations).
- Legado Sheets: somente leitura historica/importacao pontual (fora fluxo runtime).
- Ordem de dados: usuarios/perfis -> clientes -> projetos -> membros -> tarefas -> artefatos -> historico.

### 5.2 Migracao de servicos

- Servicos em `services/*` sao a camada de acesso principal.
- APIs em `app/api/*` devem consumir servicos, nao fontes diretas externas.
- Qualquer modulo novo deve entrar com contrato de erro padrao e fallback explicito.

### 5.3 Migracao de telas

- Sequencia recomendada:
  1. Home V2
  2. Clientes
  3. Workspace (decisoes/riscos)
  4. Artefatos
- Critico: telas nao podem bloquear operacao se uma integracao externa falhar.

## 6) Plano de rollback por modulo

| Modulo | Sinal de regressao | Acao imediata | Acao de recuperacao |
|---|---|---|---|
| Projetos | falha de create/list/update | rollback de deploy | validar conexao Supabase e schema |
| Atividades | falha em board/cards | rollback de deploy | revisar migrations 032/033 e permissoes |
| Conhecimento | ingestao falhando em massa | desativar entrada de ingestao na UI e rollback | revisar limites/tokens/modelos |
| Integracoes | timeout/erro repetido de provider | desligar token/env do provider | manter core operacional ativo |
| Auth | taxa alta de 401 indevido | ajustar `KAIROS_AUTH_REQUIRED` em homologacao | corrigir validacao de token e publicar patch |

## 7) Riscos de regressao e mitigacoes

- Risco: acoplamento residual ao legado.
  - Mitigacao: build exclui `backup` e `v2-foundation`; varredura periodica por termos de Sheets.
- Risco: schema incompleto em ambiente alvo.
  - Mitigacao: `npm run supabase:validate` antes de deploy.
- Risco: dependencia de integracoes externas afetar fluxo core.
  - Mitigacao: isolacao por rota e falha degradada sem bloquear operacao de projeto.
- Risco: fallback local ativado em producao.
  - Mitigacao: politica de deploy com `KAIROS_ENABLE_LOCAL_FALLBACK=false`.

## 8) Criterios de aceite da US-002

- [x] Existe plano com etapas claras.
- [x] Cada etapa/modulo pode ser ativada/desativada.
- [x] A estrategia preserva funcoes criticas durante a migracao.
