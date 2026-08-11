# US-041 - Testes E2E do Fluxo Principal V2

Data: 2026-05-12
Status: parcial

## Objetivo

Ampliar a cobertura E2E do fluxo principal da V2 para reduzir regressao nos modulos centrais de operacao.

## Cobertura implementada

Arquivo de teste:
- `tests/e2e/us041_fluxo_principal_v2.spec.ts`

Fixture:
- `tests/e2e/fixtures/us041_ingestao.txt`

Fluxo coberto na suite:
1. Selecionar projeto editavel existente via API.
2. Criar decisao no projeto.
3. Criar risco no projeto.
4. Criar card no Kanban.
5. Mover card para DOING via API e validar no quadro em `/activities`.
6. Validar leitura de projeto/decisao/risco em `/projects`.
7. Validar Home operacional (`/`) com contexto e radar executivo.

## Evidencias tecnicas

- Rotas utilizadas no teste:
  - `GET /api/projects`
  - `PATCH /api/projects/active`
  - `GET /api/projects/{projectId}/tasks`
  - `PATCH /api/tasks/{taskId}`
- Validacoes de UI:
  - Headings principais (`Clientes`, `Projetos e Decisoes`, `Atividades`, `Home Operacional`)
  - Mensagens de sucesso (`Cliente criado.`, `Decisao criada.`, `Risco criado.`)
  - Presenca de card na coluna `DOING`

## Pendencias para concluir US-041 (feito total)

1. Cobrir ciclo de artefato gerado/listado por projeto assim que o modulo de artefatos (`US-037`) estiver consolidado no backend/API.
