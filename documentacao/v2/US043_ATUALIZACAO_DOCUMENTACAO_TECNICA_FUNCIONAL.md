# US-043 - Atualizacao de documentacao tecnica e funcional V2

Data: 2026-05-12
Status: concluido

## 1) Objetivo

Consolidar orientacao tecnica e funcional da V2 para remover ambiguidade com modelo legado baseado em planilhas e orientar execucao/deploy/homologacao.

## 2) Fonte de verdade e arquitetura

- Dados estruturados: Supabase.
- Arquivos fisicos: Google Drive.
- Chat, memoria, conhecimento, tarefas e decisoes: baseados em rotas `app/api/*` + `services/*`.
- Google Sheets: legado (nao operacional).

## 3) Escopo de producao vs nao-producao

### Produzir/deploy

- `app/`, `components/`, `lib/`, `services/`, `types/`, `database/`, `scripts/`, `styles/`
- Configuracoes de raiz (`package.json`, `tsconfig`, `next.config`, etc.)

### Nao produzir/deploy

- `backup/`
- `v2-foundation/`
- artefatos locais (`.next/`, logs)

## 4) Runbook tecnico minimo

1. Preparar `.env.local` a partir de `.env.example`.
2. Executar `npm run env:check`.
3. Validar schema com `npm run supabase:validate`.
4. Executar `npm run build`.
5. Subir `npm run dev` para smoke local.

## 5) Endpoints de verificacao operacional

- `GET /api/health/env`
- `GET /api/health/supabase`
- `GET /api/projects`
- `GET /api/projects/active`
- `GET /api/integrations/health`

## 6) Diretriz funcional da V2

- Novo projeto deve nascer no Supabase.
- Kanban por projeto deve persistir no Supabase.
- Conversa com Kairos deve usar contexto de projeto quando disponivel.
- Integracoes externas nao podem ser requisito para fluxo core.

## 7) Artefatos de referencia vinculados

- Backlog oficial de US:
  - `documentacao/v2/US_Desenvolvimento_7C_Commander_V2_Supabase_Kairos.md`
- Inventario de dependencias Sheets:
  - `documentacao/v2/US001_INVENTARIO_DEPENDENCIAS_GOOGLE_SHEETS.md`
- Estrategia de migracao incremental:
  - `documentacao/v2/US002_ESTRATEGIA_MIGRACAO_INCREMENTAL.md`
- Plano de execucao/status:
  - `documentacao/v2/PLANO_EXECUCAO_V2_US.md`

## 8) Criterios de aceite da US-043

- [x] Documentacao tecnica consolidada na raiz principal.
- [x] Documentacao funcional sem orientacao ativa de planilha mestre.
- [x] Roteiro operacional minimo para validacao local e pre-deploy publicado.
