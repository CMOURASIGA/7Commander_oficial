# US-044 - Homologacao Integrada da V2

Data: 2026-05-12
Status: parcial

## Objetivo

Consolidar um roteiro unico de homologacao da V2, cobrindo Supabase como fonte oficial, Drive como repositorio documental e Kairos no fluxo operacional.

## Checklist de homologacao

Legenda:
- `[x]` validado
- `[ ]` pendente

### Fundacao e dados

- [x] Schema Supabase validado por script (`npm run supabase:validate`).
- [x] Migrations de clientes, decisoes e riscos criadas e versionadas.
- [x] Build de producao validado (`npm run build`).
- [ ] Aplicar migrations novas em ambiente alvo e registrar evidencias:
  - `036_decisions_workspace_links_and_history.sql`
  - `037_risks_links_decisions_tasks.sql`

### Fluxo funcional principal V2

- [x] Cadastro de cliente funcional via Supabase.
- [x] Cadastro e vinculacao cliente -> projeto funcionais.
- [x] Workspace de decisoes funcional por projeto.
- [x] Workspace de riscos funcional por projeto.
- [x] Home V2 com indicadores TO DO/DOING/DONE e radar executivo.
- [x] Suite E2E do fluxo principal criada (US-041 parcial).
- [ ] Validar fluxo ponta a ponta incluindo artefatos gerados/listados.
- [ ] Validar fluxo de chat Kairos com comandos operacionais em ambiente homologacao.

### Governanca e saida para producao

- [x] Escopo de subida e nao-subida consolidado no plano V2.
- [ ] Rodar checklist final com evidencias (prints/logs) em ambiente homologacao.
- [ ] Aprovar release candidate da V2 para deploy controlado.

## Resultado atual

Homologacao em progresso. Base tecnica e fluxos centrais (clientes, projetos, decisoes, riscos, atividades e home) estao implementados e com validacoes locais. Restam evidencias finais de ambiente e cobertura de artefatos/chat para fechamento completo da US-044.
