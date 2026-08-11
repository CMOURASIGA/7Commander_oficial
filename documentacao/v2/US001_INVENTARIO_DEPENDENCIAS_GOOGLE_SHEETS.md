# US-001 - Inventario tecnico de dependencias Google Sheets

Data: 2026-05-12
Status: concluido

## 1) Escopo da varredura

- Base principal ativa: `app/`, `lib/`, `services/`, `components/`, `types/`, `scripts/`, `database/`
- Legado para referencia: `backup/webapp_pmcommandcenter-main/`, `backup/snapshot-7c-base-20260512-151739/`, `v2-foundation/legacy-7c/source/`
- Documentacao funcional e tecnica: `documentacao/v2/*` e `documentacao/*`

## 2) Resultado executivo

- Codigo principal atual (deploy V2): sem dependencia operacional de Google Sheets.
- Legado 7C (backup e base legacy): possui dependencia direta de Google Sheets para sincronizacao operacional.
- Substituicao para Supabase: mapeada por dominio (clientes, projetos, status, artefatos, compartilhamento e historico).

## 3) Evidencias tecnicas do legado (pontos de dependencia)

### 3.1 Servico central de Sheets

- `backup/webapp_pmcommandcenter-main/backend/services/google-sheets-service.ts`
  - Cria/descobre planilha mestre.
  - Garante abas e cabecalhos.
  - Faz append de linhas por dominio.
  - Operacoes de leitura/metadados: `drive.files.list`, `spreadsheets.get`.
  - Operacoes de escrita: `spreadsheets.create`, `spreadsheets.batchUpdate`, `spreadsheets.values.update`, `spreadsheets.values.append`.

### 3.2 Sincronizacao por dominio

- `backup/webapp_pmcommandcenter-main/backend/services/sheets-sync-service.ts`
  - `syncClientToSheet` -> aba `CLIENTES`
  - `syncProjectToSheet` -> aba `PROJETOS`
  - `syncProjectMemberToSheet` -> aba `PROJECT_MEMBERS`
  - `syncShareToSheet` -> aba `SHARES`
  - `syncArtifactToSheet` -> aba `ARTEFATOS`

### 3.3 Provisionamento com planilha mestre

- `backup/webapp_pmcommandcenter-main/backend/services/provisioning-service.ts`
  - Cria contexto do usuario com `masterSpreadsheetId` e `masterSpreadsheetName`.
  - Escreve usuario na aba `USUARIOS`.

### 3.4 Escopo OAuth e variavel de ambiente

- `backup/webapp_pmcommandcenter-main/backend/auth/google-auth-service.ts`
  - Escopo OAuth inclui `https://www.googleapis.com/auth/spreadsheets`.
- `backup/webapp_pmcommandcenter-main/backend/config/env.ts`
  - Variavel `GOOGLE_MASTER_SHEET_NAME`.

### 3.5 Chamadas em handlers de API (fluxo operacional)

- Clientes:
  - `backup/webapp_pmcommandcenter-main/api_handlers/clients/index.ts`
- Projetos e status:
  - `backup/webapp_pmcommandcenter-main/api_handlers/projects/index.ts`
  - `backup/webapp_pmcommandcenter-main/api_handlers/projects/[id].ts`
- Compartilhamento:
  - `backup/webapp_pmcommandcenter-main/api_handlers/projects/[id]/share.ts`
- Artefatos e versoes:
  - `backup/webapp_pmcommandcenter-main/api_handlers/projects/[id]/artifacts.ts`
  - `backup/webapp_pmcommandcenter-main/api_handlers/artifacts/[id].ts`
  - `backup/webapp_pmcommandcenter-main/api_handlers/artifacts/[id]/version.ts`
- Sessao/workspace exposto ao frontend:
  - `backup/webapp_pmcommandcenter-main/api_handlers/auth/me.ts`
  - `backup/webapp_pmcommandcenter-main/services/backendApi.ts` (contrato `masterSpreadsheetId`)

### 3.6 Modelo de dados legado acoplado a Sheets

- `backup/webapp_pmcommandcenter-main/prisma/schema.prisma`
  - `UserDriveContext.masterSpreadsheetId`
  - `UserDriveContext.masterSpreadsheetName`

## 4) Estrutura de dados em Sheets identificada

Abas definidas no legado (`REQUIRED_SHEETS`):

- `USUARIOS`
- `CLIENTES`
- `PROJETOS`
- `ARTEFATOS`
- `PROJECT_MEMBERS`
- `SHARES`
- `HISTORICO`
- `CONFIG`

## 5) Classificacao por dominio e destino Supabase

| Dominio | Dependencia em Sheets (legado) | Operacao no legado | Destino Supabase V2 | Estado de substituicao |
|---|---|---|---|---|
| Cliente | Aba `CLIENTES` + `syncClientToSheet` | Escrita append no create/update | Nova tabela `clients` + API dedicada (`US-045`) | Concluido |
| Projeto | Aba `PROJETOS` + `syncProjectToSheet` | Escrita append em create/update | `projects` + `project-service` + `/api/projects` | Parcial (ativo sem Sheets) |
| Status de projeto | Coluna `status` em `PROJETOS` | Escrita append de snapshot | `projects.status` em Supabase | Parcial (ativo sem Sheets, falta fechamento formal US-004) |
| Artefato | Aba `ARTEFATOS` + `syncArtifactToSheet` | Escrita append em create/update/version | Tabela de artefatos/versoes no Supabase (US-037/US-039) | Parcial |
| Compartilhamento | Abas `PROJECT_MEMBERS` e `SHARES` | Escrita append em convite/share | `project_members` (migracao 031) + rotas `/api/projects/[projectId]/members` | Parcial (ativo na base principal) |
| Historico/Auditoria | Aba `HISTORICO` | Estrutura prevista no legado | Audit log no banco (`US-040`) | Parcial |
| Provisionamento de usuario | Aba `USUARIOS` + `masterSpreadsheetId` | Cria/atualiza contexto de planilha | `profiles` + contexto de auth sem planilha | Parcial |

## 6) Validacao na base principal (sem Sheets)

Varredura em `app/lib/services/components/types/scripts/database`:

- Sem ocorrencias de:
  - `google.sheets`
  - `spreadsheets`
  - `masterSpreadsheet`
  - `GOOGLE_MASTER_SHEET`
  - `sync*ToSheet`

Conclusao: no codigo principal atual, Sheets nao participa do fluxo operacional.

## 7) Lista de substituicao para execucao (entrada das proximas US)

1. Implementar dominio de clientes no Supabase (`US-045`) para substituir definitivamente `CLIENTES`.
2. Consolidar dominio de artefatos/versoes no Supabase (`US-037` e `US-039`) para substituir `ARTEFATOS`.
3. Fechar auditoria operacional central (`US-040`) para substituir necessidade residual de `HISTORICO`.
4. Remover residuos de contrato legado ligados a `masterSpreadsheetId` no frontend/backoffice legado (fora da base principal).
5. Tratar Drive como repositorio de arquivo apenas, sem planilha como indice (`US-004` e `US-010`).

## 8) Criterios de aceite da US-001

- [x] Existe inventario tecnico das dependencias de Sheets.
- [x] Cada dependencia possui destino definido no Supabase.
- [x] Nenhuma remocao operacional sera iniciada sem plano de substituicao (itens 1-5 acima).
