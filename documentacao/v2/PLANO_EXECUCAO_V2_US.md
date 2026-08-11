# Plano de Execucao V2 (US) - Base Principal

Data da consolidacao: 2026-05-12

## Escopo de producao (subir)

- `app/`
- `components/`
- `lib/`
- `services/`
- `types/`
- `database/`
- `scripts/`
- `styles/`
- Arquivos de raiz: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `.env.example`, `.gitignore`, `.prettierrc`, `.eslintrc.json`

## Escopo fora de producao (nao subir)

- `backup/` (historico e snapshots)
- `v2-foundation/` (referencia e base comparativa)
- `.next/` e logs locais

## Restauracao aplicada a partir de backup (12/05/2026)

- Restaurados para raiz: configs de build, tipagem, lint e scripts.
- Restaurados modulos: `components`, `services`, `types`, `database`, `styles`, `documentacao`.
- Build validado com sucesso apos excluir `backup/` e `v2-foundation/` do `tsconfig`.

## Status inicial da primeira onda (corte minimo recomendado)

Legenda: `feito`, `parcial`, `pendente`.

| US | Status | Evidencia atual | Proximo passo objetivo |
|---|---|---|---|
| US-001 | feito | Inventario tecnico concluido com mapeamento de dependencias e substituicao | Manter como baseline para US-002 e US-004 (`documentacao/v2/US001_INVENTARIO_DEPENDENCIAS_GOOGLE_SHEETS.md`) |
| US-002 | feito | Estrategia incremental publicada com fases, ativacao/desativacao e rollback por modulo | Usar como baseline de execucao (`documentacao/v2/US002_ESTRATEGIA_MIGRACAO_INCREMENTAL.md`) |
| US-003 | parcial | Camada `services/*` existe e APIs usam servicos | Definir contratos de repositorio por dominio |
| US-004 | parcial | Fluxo principal usa Supabase e integracoes | Encerrar validacao formal de ausencia de Sheets |
| US-005 | feito | `lib/supabase/*`, health checks e env | Manter checklist de variaveis de ambiente |
| US-006 | parcial | `database/schema.sql` e migrations V2 presentes | Revisar schema final e vinculos faltantes |
| US-007 | feito | Migration `017_embeddings` + `embedding-service` | Validar pgvector no ambiente alvo |
| US-008 | parcial | Permissoes por projeto em servicos e APIs | Fechar politicas RLS no banco com testes |
| US-010 | parcial | Integracao Google Drive ja implementada | Garantir uso somente documental |
| US-011 | parcial | Metadados em dominio de conhecimento/artefato parcial | Consolidar entidade de arquivo por projeto |
| US-012 | parcial | Rota de ingestao documental existe | Fechar upload ponta a ponta com metadados |
| US-014 | feito | Login/callback e profile API implementados | Validar fluxo em ambiente homologacao |
| US-016 | parcial | `requireApiAuth` em rotas principais | Cobrir 100% das rotas com autorizacao por papel |
| US-017 | feito | Home V2 redesenhada em `app/page.tsx` com contexto do projeto ativo, foco operacional e radar executivo | Monitorar ajustes visuais finos apos homologacao |
| US-018 | feito | Indicadores TO DO/DOING/DONE implementados na Home com dados reais de `GET /api/projects/{id}/tasks` | Evoluir filtro multi-projeto em segunda onda |
| US-020 | feito | `services/kairos-core.ts` integrado ao backend | Consolidar testes de regressao do core |
| US-025 | parcial | Workspace com chat/projeto/atividades existe | Reforcar contexto unico por projeto na UI |
| US-027 | parcial | Conversas e mensagens persistem, sem vinculo forte de projeto na tabela de conversa | Incluir `project_id` em conversas ou contexto equivalente |
| US-028 | parcial | Memoria operacional existe | Revisar politicas de priorizacao/retencao |
| US-029 | feito | Modulo `app/activities` no menu | Evoluir controles finos por papel |
| US-030 | feito | Quadro Kanban por projeto em `task-board-service` | Validar cenarios de concorrencia |
| US-031 | feito | Detalhe de card completo em `task-card-detail-service` | Cobrir cenarios de erro e auditoria |
| US-035 | parcial | Ingestao de documentos implementada | Completar validacao de formatos e fallback |
| US-036 | parcial | Pipeline de transcricao existe (voz/docs) | Padronizar transcricao de documento pronto |
| US-037 | parcial | Entidades e rotas relacionadas existem parcialmente | Consolidar modulo de artefatos por projeto |
| US-040 | parcial | Auditoria em tarefas/integracoes parcial | Padronizar audit log operacional central |
| US-041 | parcial | Suite E2E ampliada com cliente/projeto, decisao, risco, ingestao documental local e chat deterministico em `tests/e2e/us041_fluxo_principal_v2.spec.ts` | Fechar cobertura de artefatos por projeto apos consolidacao do modulo de artefatos (`US-037`) |
| US-043 | feito | Documentacao tecnica/funcional consolidada com runbook e diretrizes V2 | Manter atualizada por release (`documentacao/v2/US043_ATUALIZACAO_DOCUMENTACAO_TECNICA_FUNCIONAL.md`) |
| US-044 | parcial | Checklist de homologacao integrado documentado em `documentacao/v2/US044_HOMOLOGACAO_INTEGRADA_V2.md` | Executar checklist completo e anexar evidencias finais de homologacao |
| US-045 | feito | CRUD de clientes + vinculo cliente-projeto implementados com migration e UI | Consolidar cenarios E2E de cliente-projeto (`documentacao/v2/US045_CLIENTES_SUPABASE_VINCULO_PROJETO.md`) |
| US-046 | feito | Modulo de decisoes concluido com vinculos estruturais, historico de status e contexto no Kairos | Consolidar cenarios E2E de decisoes (`documentacao/v2/US046_MODULO_DECISOES_WORKSPACE.md`) |
| US-047 | feito | Modulo de riscos concluido com sugestao/confirmacao via Kairos e vinculo opcional com decisao/tarefa | Consolidar cenarios E2E de riscos (`documentacao/v2/US047_MODULO_RISCOS_WORKSPACE.md`) |

## Ordem de implementacao recomendada (proximos ciclos)

1. US-041 (completar cobertura de chat e artefatos no fluxo E2E)
2. US-044 (execucao do checklist de homologacao com evidencias de ambiente)
