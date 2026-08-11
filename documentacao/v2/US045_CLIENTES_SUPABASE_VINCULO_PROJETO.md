# US-045 - Migrar gestao de clientes para Supabase com vinculo operacional

Data: 2026-05-12
Status: concluido

## Entregas implementadas

### 1) Banco de dados

- Migration criada:
  - `database/migrations/034_clients_and_project_link.sql`
- Itens da migration:
  - Tabela `clients` com colunas operacionais (`nome`, `descricao`, `contato`, `status`, timestamps, `user_id`).
  - Coluna `projects.client_id` com FK para `clients(id)`.
  - Indices de apoio para consulta e vinculo.
- `database/schema.sql` atualizado para refletir estrutura base com clientes e vinculo em projetos.

### 2) Contratos e servicos

- Tipo de cliente criado:
  - `types/client.ts`
- Servico de clientes no Supabase:
  - `services/client-service.ts`
  - Operacoes: listar, criar, detalhar, atualizar, remover.

### 3) APIs V2 de clientes

- `GET/POST /api/clients`
  - `app/api/clients/route.ts`
- `GET/PATCH/DELETE /api/clients/[clientId]`
  - `app/api/clients/[clientId]/route.ts`

### 4) Vinculo cliente -> projeto

- Tipos de projeto atualizados para incluir:
  - `clientId`
  - `clientName`
- Arquivos:
  - `types/project.ts`
  - `services/project-service.ts`
  - `app/api/projects/route.ts`
  - `app/api/projects/[projectId]/route.ts`
  - `app/projects/page.tsx`
- Validacao de seguranca:
  - `clientId` informado em create/update de projeto so e aceito se pertencer ao usuario autenticado.

### 5) UI operacional

- Modulo de clientes implementado:
  - `app/clients/page.tsx`
  - CRUD funcional em UI.
- Navegacao atualizada:
  - `components/layout/sidebar.tsx` (item `Clientes`).
- Tela de projetos agora:
  - Exibe cliente vinculado no card do projeto.
  - Permite escolher cliente ao criar projeto.
  - Permite alterar cliente no detalhe do projeto.

### 6) Validacao tecnica

- Build validado com sucesso apos implementacao:
  - `npm run build`
- Script de validacao de schema atualizado para checar `clients` e `projects.client_id`:
  - `scripts/validate-supabase-schema.mjs`

## Criterios de aceite da US-045

- [x] Cliente pode ser criado, editado e listado via Supabase.
- [x] Projetos exibem cliente relacionado corretamente.
- [x] Operacao de cliente nao depende de Google Sheets.
