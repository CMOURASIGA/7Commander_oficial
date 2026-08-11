**7C Commander V2**

**Backlog de User Stories para Migração Supabase e Integração Kairos**

Documento de execução para desenvolvimento

**Versão:** 1.0

**Sistema:** 7C Commander

**Parceiro inteligente integrado:** Kairos

**Mudança central:** Substituir Google Sheets por Supabase como base
operacional. Manter Google Drive apenas para arquivos vinculados aos
projetos.

**Leitura considerada:** Projeto atual 7C Commander/PM Command Center e
projeto Kairos, incluindo serviços, documentação e schema Supabase
existentes.

# 0. Status de execucao (2026-05-12)

Este backlog continua sendo a referencia funcional das US. O acompanhamento de execucao (feito/parcial/pendente), evidencias e proximos passos esta consolidado em:

- `documentacao/v2/PLANO_EXECUCAO_V2_US.md`
- `documentacao/v2/US041_TESTES_E2E_FLUXO_PRINCIPAL.md`
- `documentacao/v2/US044_HOMOLOGACAO_INTEGRADA_V2.md`
- `documentacao/v2/US045_CLIENTES_SUPABASE_VINCULO_PROJETO.md`
- `documentacao/v2/US046_MODULO_DECISOES_WORKSPACE.md`
- `documentacao/v2/US047_MODULO_RISCOS_WORKSPACE.md`

# 1. Objetivo do documento

Este documento define as User Stories que o DEV precisa executar para
transformar o 7C Commander atual na V2 com Kairos integrado, mantendo o
nome 7C Commander e incorporando as funcionalidades validadas no Kairos.

A mudança mais importante é arquitetural: o 7C Commander deixa de usar
planilhas Google como controle de projeto. O Supabase passa a ser a base
oficial de dados estruturados, enquanto o Google Drive permanece apenas
como repositório dos arquivos anexados aos projetos.

# 2. Premissas obrigatórias da V2

- O nome do sistema continua sendo 7C Commander.

- Kairos passa a ser o parceiro inteligente interno do 7C Commander, não
  um sistema separado para o usuário final.

- Google Sheets não será mais utilizado como base de controle de
  projeto.

- Supabase será a fonte oficial para clientes, projetos, atividades,
  artefatos, conversas, memória, conhecimento, decisões, riscos e
  auditoria.

- Google Drive será usado somente para armazenar arquivos físicos
  vinculados ao projeto.

- Todo arquivo no Drive deve possuir um registro correspondente no
  Supabase com metadados e vínculo com projeto.

- A tela inicial do 7C Commander V2 deve ser simples, com Kairos em
  destaque e indicadores diretos TO DO, DOING e DONE.

- Dentro de cada projeto, o Kairos deve conversar com memória e contexto
  daquele projeto específico.

- O controle de atividades do Kairos deve ser incorporado ao 7C
  Commander como quadro operacional por projeto.

- A fusão deve ser incremental, com baixa regressão, preservando o que
  já funciona no 7C Commander atual.

# 3. Arquitetura alvo resumida

- Frontend: manter a base do 7C Commander em React/TypeScript,
  refatorando telas e serviços para consumo do Supabase e Kairos.

- Backend/API: concentrar integrações sensíveis, autenticação, Kairos
  Core, upload, transcrição, TTS, ingestão e auditoria.

- Supabase: banco operacional, autenticação complementar, RLS, pgvector,
  storage metadata e base de memória/conhecimento.

- Google Drive: armazenamento documental por cliente/projeto, sem
  planilhas de controle.

- OpenAI: STT, TTS, embeddings e geração cognitiva conforme serviços já
  trazidos pelo Kairos.

- Kairos Core: camada responsável por intenção, contexto, memória,
  conhecimento, acionamento de módulos e geração de resposta.

# 4. Regra de dados da V2

A partir desta versão, o Supabase passa a responder por todos os dados
estruturados do produto. O Drive não pode ser tratado como banco de
dados e nenhuma planilha deve ser usada como fonte operacional de
status, projeto, cliente ou atividades.

| **Dado**               | **Fonte oficial**                      | **Observação**                                   |
|------------------------|----------------------------------------|--------------------------------------------------|
| Clientes               | Supabase                               | Drive não controla cliente.                      |
| Projetos               | Supabase                               | Drive apenas recebe pasta do projeto.            |
| Status de projeto      | Supabase                               | Sem Google Sheets.                               |
| Atividades/Kanban      | Supabase                               | Quadro operacional deve persistir no banco.      |
| Conversas com Kairos   | Supabase                               | Vinculadas a usuário, projeto e sessão.          |
| Memória e conhecimento | Supabase + pgvector                    | Drive pode guardar fonte, mas índice é Supabase. |
| Arquivos enviados      | Google Drive + metadados no Supabase   | Arquivo físico no Drive, vínculo no banco.       |
| Artefatos gerados      | Supabase + Drive quando houver arquivo | Registro sempre no Supabase.                     |
| Auditoria e logs       | Supabase                               | Obrigatório para rastreabilidade.                |

# 5. Épicos da mudança

| **Épico** | **Nome**                                          | **Resultado esperado**                                                             |
|-----------|---------------------------------------------------|------------------------------------------------------------------------------------|
| EP-01     | Fundação técnica e migração de arquitetura        | Preparar o 7C Commander para a V2 e eliminar dependência operacional de planilhas. |
| EP-02     | Supabase como base oficial                        | Modelar banco, permissões, RLS, migrations e serviços de acesso.                   |
| EP-03     | Google Drive somente como repositório de arquivos | Manter Drive para documentos e metadados vinculados ao Supabase.                   |
| EP-04     | Autenticação, perfis e permissões                 | Preservar login Google e controlar acesso por projeto.                             |
| EP-05     | Home V2 e experiência Kairos                      | Centralizar Kairos na entrada do sistema e exibir indicadores operacionais.        |
| EP-06     | Kairos Core dentro do 7C Commander                | Integrar voz, chat, STT, TTS, memória, conhecimento e módulos cognitivos.          |
| EP-07     | Workspace de projeto com contexto vivo            | Usar Kairos dentro do projeto, com memória isolada e documentos vinculados.        |
| EP-08     | Controle de atividades estilo Kanban              | Adicionar quadro TO DO, DOING, DONE por projeto, com recursos de card.             |
| EP-09     | Artefatos, transcrição e ingestão documental      | Transformar documentos em conhecimento, gerar artefatos e controlar versões.       |
| EP-10     | Governança, testes e rollout                      | Garantir segurança, auditoria, testes E2E e migração controlada.                   |

# 6. Backlog detalhado de User Stories

As User Stories abaixo estão organizadas por épico, com prioridade,
tarefas técnicas, critérios de aceite e dependências. A prioridade P0
indica itens obrigatórios para a V2 funcionar com Supabase e Kairos; P1
indica evolução necessária, mas que pode entrar em uma segunda onda caso
exista pressão de prazo.

## EP-01 - Fundação técnica e migração de arquitetura

US-001 - Inventariar dependências atuais de Google Sheets

**Prioridade:** P0

**User Story:** Como DEV, quero mapear todos os pontos do 7C Commander
que usam Google Sheets, para remover a dependência de planilhas sem
quebrar fluxos existentes.

**Dependências:** Nenhuma dependência direta identificada

**Tarefas técnicas:**

- Identificar serviços, componentes, stores e variáveis ligadas a
  Sheets.

- Mapear leitura, escrita, sincronização e estrutura de dados atual.

- Classificar dependências por cliente, projeto, status, artefato e
  histórico.

- Gerar lista de substituição para Supabase.

**Critérios de aceite:**

- Existe inventário técnico das dependências de Sheets.

- Cada dependência possui destino definido no Supabase.

- Nenhuma remoção é iniciada sem plano de substituição.

US-002 - Definir estratégia de migração incremental

**Prioridade:** P0

**User Story:** Como PO/DEV, quero uma estratégia incremental de fusão,
para migrar com segurança o 7C Commander para Supabase e Kairos.

**Dependências:** US-001

**Tarefas técnicas:**

- Definir fases de rollout por feature flag.

- Separar migração de dados, migração de serviços e migração de telas.

- Definir plano de rollback por módulo.

- Documentar riscos de regressão.

**Critérios de aceite:**

- Existe plano com etapas claras.

- Cada etapa pode ser ativada/desativada.

- A versão atual não perde funções críticas durante a migração.

US-003 - Criar camada de abstração de repositórios

**Prioridade:** P0

**User Story:** Como DEV, quero isolar acesso a dados em repositórios,
para trocar Sheets por Supabase sem espalhar regras no frontend.

**Dependências:** US-001

**Tarefas técnicas:**

- Criar repository layer para clientes, projetos, arquivos, atividades,
  artefatos e conversas.

- Remover chamadas diretas a Sheets dos componentes.

- Padronizar DTOs e erros.

- Preparar testes unitários dos repositórios.

**Critérios de aceite:**

- Componentes consomem repositórios/serviços e não Sheets diretamente.

- Contratos de dados documentados.

- Build sem erros.

US-004 - Remover Google Sheets do fluxo operacional

**Prioridade:** P0

**User Story:** Como usuário, quero que o controle de projetos não
dependa mais de planilhas, para ter uma base mais segura e preparada
para evolução.

**Dependências:** US-003, US-006

**Tarefas técnicas:**

- Remover criação/leitura de planilha mestre como requisito operacional.

- Remover variáveis obrigatórias de Sheets.

- Atualizar documentação e mensagens da aplicação.

- Garantir que novos projetos sejam criados somente no Supabase.

**Critérios de aceite:**

- Novo projeto não cria linha em planilha.

- Sistema funciona sem configuração de Google Sheets.

- Fluxos de projeto persistem no Supabase.

## EP-02 - Supabase como base oficial

US-005 - Configurar Supabase no projeto V2

**Prioridade:** P0

**User Story:** Como DEV, quero configurar Supabase no 7C Commander,
para centralizar dados estruturados da aplicação.

**Dependências:** Nenhuma dependência direta identificada

**Tarefas técnicas:**

- Configurar URL, anon key e service role no backend.

- Criar clients frontend e backend com variáveis seguras.

- Configurar ambiente local e produção.

- Criar health check de conexão.

**Critérios de aceite:**

- Supabase conecta local e produção.

- Chaves sensíveis não ficam expostas no frontend.

- Health check retorna status da conexão.

US-006 - Criar schema operacional da V2

**Prioridade:** P0

**User Story:** Como DEV, quero criar o schema principal no Supabase,
para sustentar clientes, projetos, atividades, artefatos e Kairos.

**Dependências:** US-005

**Tarefas técnicas:**

- Criar migrations versionadas.

- Criar tabelas clients, projects, project_statuses, project_members,
  project_invites.

- Criar tabelas conversations, messages, memories, knowledge_sources,
  knowledge_chunks, embeddings.

- Criar tabelas artifacts, files, drive_files, decisions, risks,
  task_boards, task_columns, tasks.

- Criar indexes, constraints e timestamps.

**Critérios de aceite:**

- Migrations executam sem erro.

- Relacionamentos entre cliente, projeto, usuário e arquivos funcionam.

- Schema suporta consulta por projeto e usuário.

US-007 - Configurar pgvector e busca semântica

**Prioridade:** P0

**User Story:** Como Kairos, quero recuperar memórias e conhecimento por
similaridade, para responder com contexto real do projeto.

**Dependências:** US-006

**Tarefas técnicas:**

- Habilitar extensão vector.

- Criar colunas de embedding nas tabelas de memória e conhecimento.

- Criar função de match por usuário e projeto.

- Criar índices vetoriais quando aplicável.

**Critérios de aceite:**

- Busca semântica retorna chunks relevantes.

- Resultado respeita usuário e projeto.

- Consulta possui limite, threshold e ordenação por similaridade.

US-008 - Implementar políticas RLS e permissões

**Prioridade:** P0

**User Story:** Como owner do projeto, quero que os dados sejam
acessados apenas por membros autorizados, para evitar vazamento entre
projetos.

**Dependências:** US-006

**Tarefas técnicas:**

- Criar RLS para profiles, clients, projects, project_members, files,
  tasks e conversations.

- Definir papéis owner, editor e viewer.

- Bloquear escrita para viewer.

- Validar queries server-side em ações sensíveis.

**Critérios de aceite:**

- Usuário só lista projetos autorizados.

- Viewer não altera dados.

- Editor altera conforme permissão.

- Owner gerencia membros e convites.

US-009 - Criar seed mínimo e ambiente de desenvolvimento

**Prioridade:** P1

**User Story:** Como DEV, quero dados de teste consistentes, para
validar a V2 sem depender de produção.

**Dependências:** US-006

**Tarefas técnicas:**

- Criar seed de cliente, projeto, membros, quadro, tarefas, arquivos e
  conversa.

- Criar script de reset local.

- Documentar setup dev.

**Critérios de aceite:**

- DEV sobe ambiente local com dados mínimos.

- Fluxo login/projeto/quadro/Kairos pode ser testado.

## EP-03 - Google Drive somente como repositório de arquivos

US-010 - Manter Google Drive como repositório documental

**Prioridade:** P0

**User Story:** Como usuário, quero continuar usando o Drive para
arquivos do projeto, para preservar organização documental sem usar
planilhas como banco.

**Dependências:** US-004

**Tarefas técnicas:**

- Manter integração Google Drive para criação de pastas.

- Criar estrutura de pastas por cliente e projeto.

- Remover dependência de pasta 00_Controle_Projetos/Projetos_Master.

- Definir subpastas de contexto, artefatos, transcrições, anexos e
  entregáveis.

**Critérios de aceite:**

- Drive cria/usa pasta do projeto.

- Nenhuma planilha mestre é criada como requisito.

- Arquivos ficam organizados por projeto.

US-011 - Registrar metadados de arquivos no Supabase

**Prioridade:** P0

**User Story:** Como sistema, quero salvar metadados dos arquivos do
Drive no Supabase, para permitir consulta, vínculo e auditoria.

**Dependências:** US-010, US-006

**Tarefas técnicas:**

- Criar tabela drive_files ou project_files.

- Salvar drive_file_id, nome, MIME type, URL, tamanho, pasta, usuário,
  projeto e data.

- Vincular arquivos a artefatos, conversas ou tarefas quando aplicável.

- Criar endpoint/listagem por projeto.

**Critérios de aceite:**

- Todo upload no Drive gera registro no Supabase.

- Arquivos aparecem na tela do projeto a partir do Supabase.

- Exclusão/desvinculação é controlada.

US-012 - Implementar upload de arquivos por projeto

**Prioridade:** P0

**User Story:** Como usuário, quero anexar arquivos ao projeto, para que
o Kairos e a equipe usem esses documentos no contexto.

**Dependências:** US-011

**Tarefas técnicas:**

- Criar componente de upload no workspace do projeto.

- Enviar arquivo ao Drive.

- Registrar metadados no Supabase.

- Exibir lista de arquivos do projeto.

**Critérios de aceite:**

- Usuário envia arquivo e visualiza no projeto.

- Arquivo abre pelo link do Drive.

- Metadados ficam persistidos no Supabase.

US-013 - Criar governança de exclusão e atualização de arquivos

**Prioridade:** P1

**User Story:** Como owner/editor, quero controlar arquivos vinculados
ao projeto, para manter organização e rastreabilidade.

**Dependências:** US-011, US-008

**Tarefas técnicas:**

- Permitir renomear metadados quando autorizado.

- Permitir desvincular arquivo do projeto sem necessariamente apagar do
  Drive.

- Registrar ação em audit_log.

- Impedir viewer de alterar arquivos.

**Critérios de aceite:**

- Ações respeitam permissões.

- Histórico registra alteração.

- Arquivo desvinculado não aparece mais no projeto.

## EP-04 - Autenticação, perfis e permissões

US-014 - Preservar login Google no 7C Commander V2

**Prioridade:** P0

**User Story:** Como usuário, quero continuar acessando o sistema com
Google, para manter uma experiência simples de entrada.

**Dependências:** US-005

**Tarefas técnicas:**

- Manter fluxo de login Google.

- Criar/atualizar profile no Supabase ao autenticar.

- Mapear Google user id/email para usuário interno.

- Persistir sessão com segurança.

**Critérios de aceite:**

- Usuário acessa com Google.

- Profile é criado/atualizado no Supabase.

- Sessão identifica usuário em todas as operações.

US-015 - Criar gestão de membros por projeto

**Prioridade:** P1

**User Story:** Como owner, quero convidar pessoas para um projeto, para
colaborar com permissões controladas.

**Dependências:** US-008, US-014

**Tarefas técnicas:**

- Criar tela/modal de membros.

- Permitir convidar por email.

- Definir papel owner, editor ou viewer.

- Listar membros atuais do projeto.

**Critérios de aceite:**

- Owner adiciona/remove membros.

- Permissões são aplicadas nas telas e APIs.

- Usuário convidado visualiza projeto autorizado.

US-016 - Aplicar autorização nas APIs da V2

**Prioridade:** P0

**User Story:** Como sistema, quero validar permissão no backend, para
evitar que o frontend seja a única barreira de segurança.

**Dependências:** US-008, US-014

**Tarefas técnicas:**

- Criar middleware de autenticação.

- Validar membership por project_id.

- Padronizar erros 401/403.

- Cobrir endpoints de projetos, arquivos, tarefas, conversas e
  artefatos.

**Critérios de aceite:**

- Requisições sem permissão são bloqueadas.

- Usuário autorizado executa ações conforme papel.

- Logs registram bloqueios relevantes.

## EP-05 - Home V2 e experiência Kairos

US-017 - Redesenhar Home do 7C Commander V2

**Prioridade:** P0

**User Story:** Como usuário, quero uma tela inicial mais limpa com
Kairos em destaque, para iniciar trabalho rapidamente.

**Dependências:** US-006

**Tarefas técnicas:**

- Manter menu lateral atual como base.

- Centralizar área principal do Kairos.

- Remover excesso de cards da home atual.

- Exibir indicadores TO DO, DOING, DONE.

- Manter atalhos para Projetos, Atividades, Arquivos e Configurações.

**Critérios de aceite:**

- Home carrega sem poluição visual.

- Kairos fica como elemento principal.

- Indicadores refletem dados reais do Supabase.

US-018 - Implementar indicadores TO DO, DOING e DONE

**Prioridade:** P0

**User Story:** Como gestor, quero ver resumo de atividades por status,
para entender rapidamente o andamento dos projetos.

**Dependências:** US-032

**Tarefas técnicas:**

- Consultar tarefas do usuário/projetos autorizados.

- Agrupar por TO DO, DOING e DONE.

- Permitir filtro por projeto quando aplicável.

- Atualizar após mudanças no Kanban.

**Critérios de aceite:**

- Números batem com o banco.

- Indicadores atualizam após criar/mover tarefa.

- Usuário sem tarefa vê estado vazio claro.

US-019 - Criar estados visuais do Kairos na Home

**Prioridade:** P1

**User Story:** Como usuário, quero entender quando o Kairos está
ouvindo, pensando ou respondendo, para confiar na interação.

**Dependências:** US-021, US-022

**Tarefas técnicas:**

- Criar estados: inativo, ouvindo, pensando, respondendo e erro.

- Adicionar feedback visual sem excesso.

- Integrar estados ao fluxo de voz/chat.

**Critérios de aceite:**

- Estado visual muda conforme interação.

- Erros são exibidos de forma compreensível.

- Interface é responsiva.

## EP-06 - Kairos Core dentro do 7C Commander

US-020 - Integrar Kairos Core ao backend do 7C Commander

**Prioridade:** P0

**User Story:** Como sistema, quero um núcleo Kairos dentro do 7C
Commander, para orquestrar intenção, contexto, memória e resposta.

**Dependências:** US-006, US-014

**Tarefas técnicas:**

- Criar/portar serviço kairos-core.

- Carregar contexto do usuário e projeto.

- Recuperar memória e conhecimento.

- Acionar módulos especializados.

- Salvar mensagens, decisões e eventos relevantes.

**Critérios de aceite:**

- Kairos responde dentro do 7C Commander.

- Resposta usa contexto do projeto quando houver projeto ativo.

- Interações são persistidas no Supabase.

US-021 - Implementar captura de voz

**Prioridade:** P1

**User Story:** Como usuário, quero falar com o Kairos, para interagir
de forma natural com o sistema.

**Dependências:** US-020

**Tarefas técnicas:**

- Solicitar permissão de microfone.

- Gravar áudio com controle iniciar/parar.

- Tratar ausência de permissão.

- Controlar sessão de voz.

**Critérios de aceite:**

- Usuário inicia e encerra captura.

- Sistema informa falha de permissão.

- Áudio é enviado para transcrição.

US-022 - Implementar Speech-to-Text

**Prioridade:** P1

**User Story:** Como usuário, quero que minha fala seja transcrita, para
que o Kairos entenda meus comandos.

**Dependências:** US-021

**Tarefas técnicas:**

- Criar endpoint de transcrição.

- Integrar modelo STT configurável.

- Salvar transcrição no Supabase.

- Associar transcrição a conversa e projeto quando houver.

**Critérios de aceite:**

- Áudio gera texto.

- Texto aparece na conversa.

- Transcrição fica registrada no histórico.

US-023 - Implementar Text-to-Speech

**Prioridade:** P1

**User Story:** Como usuário, quero ouvir a resposta do Kairos, para
usar a plataforma em modo voice-first.

**Dependências:** US-020

**Tarefas técnicas:**

- Criar endpoint TTS.

- Configurar modelo e voz por env.

- Gerar áudio e controlar playback.

- Permitir pausar ou interromper resposta.

**Critérios de aceite:**

- Kairos responde com áudio.

- Usuário consegue interromper reprodução.

- Falhas de TTS não bloqueiam resposta textual.

US-024 - Integrar Prompt Mestre e módulos de capacidade

**Prioridade:** P0

**User Story:** Como Kairos, quero usar módulos especializados, para
apoiar planejamento, BPMN, status report e análise executiva.

**Dependências:** US-020

**Tarefas técnicas:**

- Portar prompts/inteligências do Kairos para módulos internos.

- Mapear agentes externos atuais do 7C para capacidades internas.

- Criar roteamento por intenção.

- Manter links externos como opção configurável, não como dependência
  principal.

**Critérios de aceite:**

- Kairos escolhe módulo adequado por intenção.

- Módulos usam contexto do projeto.

- Agentes externos não são obrigatórios para fluxo principal.

## EP-07 - Workspace de projeto com contexto vivo

US-025 - Adicionar Kairos dentro do workspace do projeto

**Prioridade:** P0

**User Story:** Como usuário, quero conversar com o Kairos dentro de um
projeto, para receber ajuda contextualizada naquele trabalho.

**Dependências:** US-020

**Tarefas técnicas:**

- Adicionar painel Kairos no ProjectWorkspace.

- Passar project_id ativo para cada conversa.

- Exibir histórico daquele projeto.

- Evitar mistura de contexto entre projetos.

**Critérios de aceite:**

- Kairos reconhece projeto ativo.

- Histórico exibido pertence ao projeto.

- Perguntas de um projeto não usam contexto de outro indevidamente.

US-026 - Criar Project Resolver

**Prioridade:** P1

**User Story:** Como Kairos, quero identificar o projeto correto quando
o usuário mencionar um projeto, para operar no contexto certo.

**Dependências:** US-020, US-006

**Tarefas técnicas:**

- Portar/criar project-resolver.

- Calcular confiança de correspondência.

- Sugerir projeto quando houver ambiguidade.

- Permitir troca de projeto ativo.

**Critérios de aceite:**

- Projeto é identificado corretamente na maioria dos casos.

- Ambiguidade gera pedido de confirmação.

- Project_id é usado em memória, conversa e tarefas.

US-027 - Persistir conversas por projeto

**Prioridade:** P0

**User Story:** Como usuário, quero recuperar conversas anteriores do
projeto, para continuar o raciocínio sem começar do zero.

**Dependências:** US-006, US-025

**Tarefas técnicas:**

- Criar conversations e messages por projeto.

- Salvar role, conteúdo, especialista/módulo, origem e timestamps.

- Permitir listar conversas por projeto.

- Permitir retomar conversa.

**Critérios de aceite:**

- Histórico é recuperável.

- Mensagens estão vinculadas ao projeto.

- A troca de projeto muda o histórico exibido.

US-028 - Criar memória operacional por projeto

**Prioridade:** P0

**User Story:** Como Kairos, quero lembrar decisões, preferências e
contexto do projeto, para ajudar com continuidade.

**Dependências:** US-007, US-025

**Tarefas técnicas:**

- Salvar memórias vinculadas a usuário e projeto.

- Classificar memória por tipo e prioridade.

- Gerar embedding quando aplicável.

- Recuperar memórias relevantes na resposta.

**Critérios de aceite:**

- Memória persiste após reload.

- Kairos recupera informações relevantes.

- Memórias respeitam isolamento de projeto e permissão.

## EP-08 - Controle de atividades estilo Kanban

US-029 - Criar módulo Atividades no menu lateral

**Prioridade:** P0

**User Story:** Como usuário, quero acessar uma tela de atividades, para
controlar execução dos projetos no 7C Commander.

**Dependências:** US-006, US-017

**Tarefas técnicas:**

- Adicionar item Atividades no menu.

- Criar rota/tela de atividades.

- Permitir visão geral e filtro por projeto.

- Carregar dados do Supabase.

**Critérios de aceite:**

- Menu aparece na aplicação.

- Tela lista atividades autorizadas.

- Filtro por projeto funciona.

US-030 - Criar quadro Kanban por projeto

**Prioridade:** P0

**User Story:** Como gestor, quero um quadro TO DO, DOING e DONE por
projeto, para controlar a execução de forma simples.

**Dependências:** US-029

**Tarefas técnicas:**

- Criar task_boards e task_columns.

- Criar colunas padrão TO DO, DOING e DONE.

- Renderizar cards por coluna.

- Persistir status e posição no Supabase.

**Critérios de aceite:**

- Cada projeto possui quadro próprio.

- Cards permanecem no lugar após reload.

- Quadros de projetos diferentes não se misturam.

US-031 - Implementar card de atividade completo

**Prioridade:** P0

**User Story:** Como usuário, quero registrar detalhes de cada
atividade, para gerenciar execução com clareza.

**Dependências:** US-030, US-011

**Tarefas técnicas:**

- Permitir título, descrição, responsável, prazo, prioridade, etiquetas
  e status.

- Adicionar checklist, comentários e anexos.

- Registrar histórico de alterações.

- Validar campos obrigatórios.

**Critérios de aceite:**

- Card pode ser criado, editado e fechado.

- Checklist e comentários persistem.

- Histórico mostra mudanças principais.

US-032 - Implementar drag-and-drop no Kanban

**Prioridade:** P1

**User Story:** Como usuário, quero mover cards entre colunas, para
atualizar o andamento rapidamente.

**Dependências:** US-030, US-018

**Tarefas técnicas:**

- Adicionar drag-and-drop entre colunas.

- Atualizar status e posição no Supabase.

- Tratar concorrência simples.

- Atualizar indicadores da Home.

**Critérios de aceite:**

- Card move visualmente e persiste.

- Ordem é mantida após reload.

- Indicadores refletem mudança.

US-033 - Permitir Kairos criar e atualizar atividades

**Prioridade:** P1

**User Story:** Como usuário, quero pedir ao Kairos para criar ou mover
tarefas, para acelerar a gestão operacional.

**Dependências:** US-020, US-031

**Tarefas técnicas:**

- Detectar intenção de criar, atualizar, mover ou comentar tarefa.

- Executar ação no projeto ativo.

- Confirmar ação ao usuário.

- Registrar evento no histórico da tarefa.

**Critérios de aceite:**

- Comando cria tarefa real no quadro.

- Comando move tarefa existente.

- Ação é auditável e respeita permissões.

US-034 - Usar atividades como contexto do Kairos

**Prioridade:** P1

**User Story:** Como Kairos, quero consultar tarefas abertas e
bloqueios, para orientar próximas ações no projeto.

**Dependências:** US-033

**Tarefas técnicas:**

- Incluir TO DO/DOING/DONE no contexto do projeto.

- Permitir resumo de atividades por comando.

- Sugerir próximas ações com base no quadro.

- Gerar alertas de prazo quando solicitado.

**Critérios de aceite:**

- Kairos responde considerando tarefas reais.

- Resumo bate com quadro.

- Sugestões citam atividades existentes.

## EP-09 - Artefatos, transcrição e ingestão documental

US-035 - Implementar ingestão de documentos do projeto

**Prioridade:** P0

**User Story:** Como usuário, quero enviar documentos para o Kairos ler,
para transformar arquivos em conhecimento utilizável no projeto.

**Dependências:** US-012, US-007

**Tarefas técnicas:**

- Processar PDF, DOCX, TXT e Markdown.

- Extrair texto do arquivo salvo no Drive.

- Aplicar chunking.

- Salvar fonte e chunks no Supabase.

- Gerar embeddings dos chunks.

**Critérios de aceite:**

- Documento enviado pode ser indexado.

- Chunks são vinculados ao arquivo e projeto.

- Kairos recupera conhecimento do documento.

US-036 - Transcrever documento pronto dentro do sistema

**Prioridade:** P0

**User Story:** Como usuário, quero transformar conteúdo de um documento
em transcrição estruturada dentro do 7C Commander, para reaproveitar
informações no projeto.

**Dependências:** US-035

**Tarefas técnicas:**

- Criar ação Transcrever/Extrair conteúdo no arquivo.

- Gerar texto limpo e estruturado.

- Salvar transcrição como artefato e/ou conhecimento.

- Permitir revisão pelo usuário antes de consolidar quando necessário.

**Critérios de aceite:**

- Usuário seleciona arquivo e gera transcrição.

- Transcrição fica vinculada ao projeto.

- Kairos consegue usar a transcrição como contexto.

US-037 - Criar gestão de artefatos por projeto

**Prioridade:** P0

**User Story:** Como usuário, quero ver todos os artefatos gerados no
projeto, para controlar entregáveis e versões.

**Dependências:** US-011, US-027

**Tarefas técnicas:**

- Criar tabela artifacts.

- Vincular artefato a projeto, conversa, módulo, tipo, status e arquivo
  Drive quando houver.

- Exibir lista no workspace.

- Permitir abrir, baixar ou revisar artefato.

**Critérios de aceite:**

- Artefatos são listados por projeto.

- Cada artefato tem vínculo e versão.

- Artefato gerado por Kairos fica rastreável.

US-038 - Gerar artefatos a partir do Kairos

**Prioridade:** P1

**User Story:** Como usuário, quero pedir ao Kairos documentos, atas,
backlog, status report e BPMN, para acelerar entregas do projeto.

**Dependências:** US-024, US-037

**Tarefas técnicas:**

- Criar intents de geração de artefato.

- Permitir salvar resultado no Supabase.

- Quando necessário, gerar arquivo no Drive.

- Registrar origem da conversa e módulo usado.

**Critérios de aceite:**

- Kairos gera artefato contextual.

- Artefato aparece na lista do projeto.

- Arquivo fica no Drive quando aplicável.

US-039 - Controlar versões de artefatos

**Prioridade:** P1

**User Story:** Como usuário, quero versionar artefatos, para acompanhar
evolução dos entregáveis.

**Dependências:** US-037

**Tarefas técnicas:**

- Criar artifacts_versions.

- Permitir nova versão a partir de edição ou regeneração.

- Exibir histórico de versões.

- Marcar versão atual.

**Critérios de aceite:**

- Nova versão não apaga versão anterior.

- Usuário identifica versão atual.

- Histórico mostra data, autor e origem.

## EP-10 - Governança, testes e rollout

US-040 - Criar audit log operacional

**Prioridade:** P0

**User Story:** Como administrador/owner, quero rastrear ações
relevantes, para ter segurança e governança.

**Dependências:** US-006, US-016

**Tarefas técnicas:**

- Criar tabela audit_logs.

- Registrar criação/edição/exclusão de projeto, arquivo, tarefa, membro
  e artefato.

- Registrar ações executadas pelo Kairos.

- Permitir consulta técnica por projeto e usuário.

**Critérios de aceite:**

- Ações críticas geram log.

- Log contém usuário, ação, entidade, data e metadados.

- Viewer não acessa logs administrativos sem permissão.

US-041 - Criar testes E2E do fluxo principal

**Prioridade:** P0

**User Story:** Como equipe de desenvolvimento, quero validar o fluxo
completo, para evitar regressões na V2.

**Dependências:** US-017, US-025, US-030, US-035

**Tarefas técnicas:**

- Criar testes de login.

- Criar testes de criar cliente/projeto.

- Criar testes de upload de arquivo.

- Criar testes de conversa com Kairos.

- Criar testes de criar/mover tarefa.

- Criar testes de artefato gerado.

**Critérios de aceite:**

- Teste cobre login -\> projeto -\> arquivo -\> Kairos -\> tarefa -\>
  artefato.

- Pipeline falha se fluxo principal quebrar.

- Cenários críticos documentados.

US-042 - Criar plano de migração de dados existentes

**Prioridade:** P1

**User Story:** Como equipe, quero migrar dados do modelo anterior
quando necessário, para não perder informações já criadas no 7C
Commander.

**Dependências:** US-006, US-001

**Tarefas técnicas:**

- Criar script opcional de importação de planilhas existentes.

- Mapear colunas antigas para schema Supabase.

- Validar duplicidades.

- Registrar log de migração.

**Critérios de aceite:**

- Dados antigos podem ser importados de forma controlada.

- Importação não é obrigatória para novos ambientes.

- Erros de migração são reportados sem corromper dados.

US-043 - Atualizar documentação técnica e funcional

**Prioridade:** P0

**User Story:** Como DEV/PM, quero documentação atualizada, para manter
clareza sobre a V2 e evitar decisões antigas de Sheets.

**Dependências:** US-004, US-005

**Tarefas técnicas:**

- Atualizar README e documentação de setup.

- Documentar env vars novas.

- Documentar que Sheets foi removido do controle operacional.

- Documentar uso do Drive apenas como repositório de arquivos.

- Documentar fluxo Kairos e Supabase.

**Critérios de aceite:**

- Documentação reflete a arquitetura V2.

- Novo DEV consegue subir ambiente.

- Não há instrução ativa pedindo planilha mestre.

US-044 - Executar homologação integrada da V2

**Prioridade:** P0

**User Story:** Como PO, quero homologar a V2 ponta a ponta, para
liberar a mudança com confiança.

**Dependências:** US-041, US-043

**Tarefas técnicas:**

- Preparar checklist de homologação.

- Validar fluxo sem Google Sheets.

- Validar Drive apenas com arquivos.

- Validar Supabase como fonte oficial.

- Validar Kairos na home e no projeto.

- Validar atividades, arquivos, memória e artefatos.

**Critérios de aceite:**

- Checklist aprovado.

- Nenhum fluxo crítico depende de Sheets.

- V2 está pronta para deploy controlado.

## EP-11 - Lacunas obrigatórias complementares da V2

US-045 - Migrar gestão de clientes para Supabase com vínculo operacional

**Prioridade:** P0

**User Story:** Como usuário, quero cadastrar e gerenciar clientes no modelo V2, para manter o fluxo 7C (Cliente -> Projeto) sem dependência de planilhas.

**Dependências:** US-006, US-016

**Tarefas técnicas:**

- Criar APIs de clientes (CRUD) no backend V2.

- Garantir vínculo cliente-projeto no schema e nas telas.

- Migrar listagem/edição para leitura e escrita via Supabase.

- Aplicar autorização por projeto/cliente vinculado.

**Critérios de aceite:**

- Cliente pode ser criado, editado e listado via Supabase.

- Projetos exibem cliente relacionado corretamente.

- Nenhuma operação de cliente depende de Google Sheets.

US-046 - Implementar módulo de decisões no workspace do projeto

**Prioridade:** P0

**User Story:** Como gestor, quero registrar e acompanhar decisões por projeto, para manter rastreabilidade executiva e contexto para o Kairos.

**Dependências:** US-006, US-020, US-025

**Tarefas técnicas:**

- Criar tela/aba de decisões com criação, atualização de status e consulta.

- Vincular decisão a projeto, conversa e artefato quando houver.

- Permitir salvar resposta do Kairos como decisão estruturada.

- Incluir decisões no contexto recuperado pelo Kairos Core.

**Critérios de aceite:**

- Decisões ficam visíveis por projeto com histórico de status.

- Decisão criada pelo Kairos fica auditável.

- Respostas do Kairos consideram decisões existentes no contexto.

US-047 - Implementar módulo de riscos no workspace do projeto

**Prioridade:** P0

**User Story:** Como gestor, quero controlar riscos por projeto, para tratar impacto e mitigação com apoio do Kairos.

**Dependências:** US-006, US-020, US-025

**Tarefas técnicas:**

- Criar tela/aba de riscos com impacto, probabilidade, mitigação, dono e status.

- Permitir criação manual e sugestão de risco via Kairos.

- Vincular risco ao projeto e às decisões/tarefas relacionadas quando existir.

- Incluir riscos abertos no contexto do Kairos e no resumo operacional.

**Critérios de aceite:**

- Riscos podem ser criados, atualizados e consultados por projeto.

- Sugestões do Kairos podem ser confirmadas e persistidas.

- Daily e respostas do Kairos refletem riscos ativos.

US-048 - Atualizar ajuda e onboarding da V2

**Prioridade:** P1

**User Story:** Como usuário, quero uma ajuda atualizada da V2, para entender claramente como usar Kairos, projetos, atividades e artefatos no novo modelo.

**Dependências:** US-017, US-025, US-043

**Tarefas técnicas:**

- Atualizar página Ajuda com fluxo V2 e papéis de acesso.

- Explicar diferença entre Kairos, capacidades internas e agentes externos fallback.

- Documentar uso de voz, ingestão de documentos, decisões, riscos e Kanban.

- Incluir orientação de fonte de verdade: Supabase para dados estruturados e Drive para arquivos.

**Critérios de aceite:**

- Ajuda reflete arquitetura e fluxos atuais da V2.

- Usuário novo consegue executar fluxo principal sem suporte externo.

- Não há instruções conflitantes com o modelo antigo por planilhas.

US-049 - Persistir sessões de voz com rastreabilidade

**Prioridade:** P1

**User Story:** Como time técnico, quero registrar sessões de voz ponta a ponta, para auditoria, diagnóstico e melhoria da experiência voice-first.

**Dependências:** US-006, US-021, US-022, US-023

**Tarefas técnicas:**

- Criar/validar tabela voice_sessions no schema V2.

- Registrar início, fim, duração, status e erros da sessão.

- Vincular sessão a usuário, projeto, conversa e mensagens.

- Expor consulta técnica para suporte e troubleshooting.

**Critérios de aceite:**

- Cada interação de voz gera sessão rastreável no banco.

- Falhas de STT/TTS ficam registradas com contexto mínimo.

- Métricas básicas de sessão podem ser auditadas por projeto.

US-050 - Formalizar fallback de agentes externos durante migração

**Prioridade:** P1

**User Story:** Como operação, quero manter agentes externos disponíveis por configuração, para garantir continuidade enquanto capacidades internas amadurecem.

**Dependências:** US-024, US-043

**Tarefas técnicas:**

- Manter links externos parametrizados por ambiente.

- Exibir status de disponibilidade por agente no workspace.

- Registrar quando execução foi interna (Kairos) ou fallback externo.

- Definir regra clara de prioridade: interno primeiro, externo quando necessário.

**Critérios de aceite:**

- Usuário consegue acionar fallback externo sem quebrar fluxo.

- Execução interna e externa ficam distinguíveis em histórico/auditoria.

- Mudança de configuração não exige alteração de código.

US-051 - Integrar Daily operacional com tarefas, decisões e riscos

**Prioridade:** P1

**User Story:** Como gestor, quero um Daily consolidado por projeto, para priorizar ações com base em tarefas, decisões pendentes e riscos ativos.

**Dependências:** US-034, US-046, US-047

**Tarefas técnicas:**

- Consolidar dados de TO DO/DOING/DONE, decisões abertas e riscos ativos.

- Exibir resumo diário por projeto e por usuário.

- Permitir comando no Kairos para gerar/regerar Daily contextual.

- Registrar geração do Daily em histórico operacional.

**Critérios de aceite:**

- Daily reflete dados reais e atualizados do projeto.

- Recomendações do Daily citam tarefas/decisões/riscos existentes.

- Time consegue usar o Daily como ponto de execução diário.

# 7. Corte mínimo recomendado para a primeira entrega da V2

Para evitar uma entrega grande demais, a recomendação é separar a
execução em duas ondas. A primeira onda deve entregar a mudança
arquitetural e o fluxo operacional mínimo sem Google Sheets.

- Obrigatórios na primeira onda: US-001 a US-008, US-010 a US-012,
  US-014, US-016 a US-018, US-020, US-025, US-027 a US-031, US-035 a
  US-037, US-040, US-041, US-043, US-044, US-045, US-046 e US-047.

- Podem entrar na segunda onda: voz completa STT/TTS se houver pressão
  de prazo, convites avançados, drag-and-drop refinado, automações por
  Kairos, versionamento avançado, alertas e migração opcional de dados
  antigos.

- A V2 não deve ser considerada entregue se ainda depender de Google
  Sheets para controle operacional.

# 8. Definition of Done geral da mudança

- O 7C Commander cria, lista, edita e consulta projetos usando Supabase.

- Nenhum fluxo operacional depende de Google Sheets.

- Google Drive é usado apenas para arquivos físicos vinculados ao
  projeto.

- Todo arquivo do Drive possui metadados registrados no Supabase.

- Kairos aparece na Home e dentro do projeto.

- Kairos usa project_id ativo para memória, conhecimento, conversas,
  tarefas e artefatos.

- Atividades TO DO, DOING e DONE persistem no Supabase.

- Permissões por projeto impedem vazamento de dados.

- Testes E2E cobrem o fluxo principal.

- Documentação foi atualizada removendo a orientação antiga de planilha
  mestre.

# 9. Observação crítica para o DEV

A planilha Google deve ser tratada como legado. Ela pode existir apenas
como fonte temporária de importação, caso haja dados antigos a migrar.
Depois da migração, a planilha não deve ser consultada pelo sistema para
tomar decisões, montar dashboards, buscar status, controlar tarefas ou
alimentar o Kairos.

A partir da V2, a fonte da verdade é o Supabase. O Drive armazena
arquivos. O Kairos usa Supabase como memória operacional e Drive como
fonte documental quando houver arquivos vinculados.
