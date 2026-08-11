**7C Commander V2**

**Documento Final de Unificação com Kairos**

Direcionamento funcional, técnico, arquitetural e backlog de
desenvolvimento

| **Premissa principal:** O nome do sistema continua sendo 7C Commander. O Kairos não substitui o produto. Ele entra como parceiro cognitivo interno, voice-first, contextual e orientado por projeto. |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

| **Base analisada:** Foram considerados os dois projetos enviados: webapp_pmcommandcenter-main, atual 7C Commander, e Kairos, incluindo documentação, estrutura de telas, serviços, APIs, modelos de dados, fluxos de voz, ingestão de conhecimento, memória e quadro de atividades. |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# Sumário Executivo

Este documento consolida a evolução do 7C Commander para sua V2,
incorporando as capacidades do Kairos sem descaracterizar a base já
existente. A proposta é manter o 7C Commander como plataforma principal
de gestão de projetos, clientes, artefatos e agentes, adicionando uma
camada cognitiva operacional com voz, memória, conhecimento contextual,
ingestão de documentos e quadro de atividades.

A leitura dos projetos mostra que o 7C Commander está estruturado como
cockpit de projetos com React, Vite, TypeScript, Tailwind, Zustand,
Vercel Functions, Prisma/Postgres, Google OAuth, Drive e Sheets. Já o
Kairos está estruturado em Next.js, TypeScript, Supabase, OpenAI API,
STT, TTS, pgvector, memória, conhecimento, Project Resolver, Voice Room,
Daily e Kanban.

A V2 deve unir esses mundos com uma decisão clara: o 7C Commander
continua sendo o produto. O Kairos passa a ser a inteligência interna
que opera dentro dele, principalmente na Home e dentro de cada projeto.

| **Item**                   | **Direção definida**                                                                               |
|----------------------------|----------------------------------------------------------------------------------------------------|
| Nome do produto            | 7C Commander                                                                                       |
| Papel do Kairos            | Parceiro profissional inteligente integrado ao 7C Commander                                        |
| Experiência principal      | Voice-first, com chat textual como apoio e histórico                                               |
| Entidade central           | Projeto                                                                                            |
| Base operacional principal | Supabase, com pgvector para memória e conhecimento                                                 |
| Google Drive / Google Sheets | Google Drive mantido apenas para arquivos vinculados aos projetos. Google Sheets deixa de ser base de controle operacional na V2 |
| Agentes externos atuais    | Mantidos, mas reposicionados como capacidades ou módulos especializados                            |
| Novidade-chave da V2       | Kairos dentro da Home e dentro do workspace de cada projeto, com contexto automático               |


## Ajuste arquitetural obrigatório incorporado

Na V2, o 7C Commander deixa de usar Google Sheets como camada de controle operacional dos projetos. O Supabase passa a ser a base oficial para projetos, clientes, atividades, status, responsáveis, histórico, memória, transcrições, artefatos e interações com o Kairos. O Google Drive permanece apenas como repositório de arquivos vinculados aos projetos, mantendo referências no Supabase, como ID do arquivo, nome, tipo, URL, projeto relacionado e data de inclusão.

# 1. Diagnóstico dos projetos atuais

## 1.1 7C Commander atual

O 7C Commander já funciona como plataforma operacional de projetos. A
base possui navegação principal, login, clientes, projetos, artefatos,
agentes, ajuda e configurações. O fluxo documentado e implementado é
orientado por: Login \> Cliente \> Projeto \> Agente \> Artefatos.

- Frontend em React + Vite + TypeScript, com Tailwind e Zustand.

- Backend preparado em Vercel Functions, com Prisma e Postgres.

- Autenticação Google OAuth2 e sessão por cookie HTTP-only.

- Integração com Google Drive e Google Sheets para provisionamento,
  pastas, controle e sincronização.

- Modelagem de clientes, projetos, membros, compartilhamento, histórico
  e artefatos versionados.

- Workspace do projeto com abas: Visão Geral, Contexto, Agentes,
  Artefatos, Histórico e Compartilhamento.

- Artefatos com estratégia de sobrescrita controlada ou nova versão,
  status e metadados.

- Agentes externos configuráveis por variáveis de ambiente: Storyboard,
  PM AI Partner, BPMN e Status Report.

## 1.2 Kairos atual

O Kairos já materializa a visão de inteligência operacional. Ele não é
apenas uma tela de chat. O projeto possui núcleo cognitivo, memória,
conhecimento, voz, project resolver, ingestão de arquivos, integração
com OpenAI e quadro de atividades.

- Stack em Next.js App Router + TypeScript + Tailwind + Supabase +
  OpenAI API.

- Voice Room com ciclo voz \> STT \> Kairos Core \> TTS.

- OpenAI STT para transcrição e OpenAI TTS para resposta por voz.

- Kairos Core com memória, conhecimento, resolução de projeto e módulos
  de capacidade.

- Project Resolver para identificar, reutilizar, sugerir ou criar
  contexto de projeto.

- Knowledge Layer com upload e ingestão de arquivos, incluindo DOCX,
  texto, áudio e imagem.

- Memory Layer com embeddings, busca semântica, compressão e
  priorização.

- Quadro de atividades com colunas TO DO, DOING e DONE, cards,
  responsáveis, labels, checklists, comentários, anexos e trilha de
  atividade.

- Daily operacional com agenda, pendências, riscos e resumo do quadro.

- Integrações preparadas com Gmail, Calendar, Drive, Azure DevOps e n8n.

| **Dimensão** | **7C Commander**                              | **Kairos**                                  | **Decisão para V2**                                                                          |
|--------------|-----------------------------------------------|---------------------------------------------|----------------------------------------------------------------------------------------------|
| Produto      | Plataforma de gestão de projetos e artefatos. | Sistema cognitivo operacional.              | Manter 7C como produto e integrar Kairos como camada interna.                                |
| Experiência  | Workspace visual por projeto.                 | Voice-first e chat contextual.              | Home e projetos devem ter Kairos como ponto de interação.                                    |
| Dados        | Prisma/Postgres e Google Drive/Sheets.        | Supabase, pgvector, memória e conhecimento. | Adotar Supabase como base cognitiva e operacional principal, preservando integrações Google. |
| IA           | Agentes externos por link.                    | Kairos Core com módulos internos.           | Converter agentes em capacidades internas, mantendo links externos como fallback.            |
| Artefatos    | Versionamento e preview.                      | Geração contextual e conhecimento extraído. | Unificar artefatos com conhecimento, decisões e histórico.                                   |
| Atividades   | Ainda não central como Kanban.                | Task board completo.                        | Adicionar quadro TO DO, DOING e DONE ao 7C Commander V2.                                     |

# 2. Visão do 7C Commander V2

A V2 deve ser posicionada como uma plataforma de gestão de projetos com
inteligência operacional integrada. O usuário não deve entrar no sistema
para escolher um bot. Ele deve entrar para conduzir projetos, gerar
documentos, organizar atividades, registrar decisões, consultar contexto
e pedir ajuda ao Kairos.

## 2.1 Definição do produto

O 7C Commander V2 será uma plataforma web única para gestão de clientes,
projetos, conhecimento, atividades, decisões, riscos, artefatos e
agentes, com o Kairos como inteligência profissional contextual capaz de
conversar por voz, entender o projeto ativo e transformar conversas e
documentos em estrutura operacional.

## 2.2 Papel do Kairos

- Ser a interface inteligente principal da Home.

- Ser o parceiro contextual dentro de cada projeto.

- Entender se a conversa se refere a um projeto existente ou novo.

- Recuperar memória, decisões, tarefas, riscos, artefatos e conhecimento
  do projeto.

- Transcrever documentos e áudios para dentro do sistema.

- Gerar ou atualizar artefatos com base no contexto.

- Criar tarefas, registrar decisões e apontar riscos a partir da
  conversa.

- Responder por voz quando acionado ou quando a sessão voice-first
  estiver ativa.

## 2.3 O que não deve mudar

- O produto não deve mudar de nome. Continua sendo 7C Commander.

- O menu lateral principal deve permanecer: Início, Clientes, Projetos,
  Artefatos, Agentes, Ajuda e Configurações.

- O fluxo por cliente, projeto e artefato deve continuar sendo a espinha
  dorsal do produto.

- As funcionalidades atuais de artefatos, histórico, compartilhamento e
  Google Drive/Sheets não devem ser descartadas.

- Os agentes externos existentes não devem desaparecer no primeiro
  momento. Eles devem ser mantidos como fallback ou capacidade
  complementar.

# 3. Experiência de usuário esperada

## 3.1 Nova Home

A Home da V2 deve ser redesenhada para tirar o excesso de informação e
destacar o Kairos. Ela deve ser a tela de entrada operacional do
usuário, com uma inteligência central pronta para conversar e
indicadores simples de andamento.

| **Elemento**    | **Comportamento esperado**                                                                                       |
|-----------------|------------------------------------------------------------------------------------------------------------------|
| Kairos central  | Avatar, animação ou área visual central com estados: Inativo, Ouvindo, Processando, Respondendo, Pausado e Erro. |
| Entrada por voz | Botões para iniciar, pausar e finalizar conversa, com feedback visual de microfone e processamento.              |
| Projeto ativo   | Exibir claramente o projeto ativo ou permitir escolher um projeto antes de falar.                                |
| Indicadores     | Somente TO DO, DOING e DONE na Home, representando o volume de atividades/projetos em cada estágio.              |
| Chat textual    | Apoio e fallback, não como experiência principal da Home.                                                        |
| Ações rápidas   | Criar projeto, importar documento, abrir atividades, abrir projeto ativo e acessar artefatos.                    |

## 3.2 Kairos dentro do projeto

Ao entrar em um projeto, o Kairos deve assumir automaticamente o
contexto daquele projeto. Esta é uma regra crítica. Dentro do projeto, o
usuário não deve precisar explicar novamente qual é o projeto ou onde
está o contexto.

- Usar automaticamente o projectId da rota do workspace.

- Carregar memória relacionada ao projeto.

- Carregar conhecimento explícito do projeto.

- Carregar tarefas, decisões, riscos e artefatos relacionados.

- Permitir conversa por voz e por texto vinculada ao projeto.

- Permitir criação de tarefas, decisões e artefatos a partir de comandos
  naturais.

- Evitar mistura de contexto entre projetos.

## 3.3 Workspace do projeto V2

| **Aba**          | **Objetivo na V2**                                                                              |
|------------------|-------------------------------------------------------------------------------------------------|
| Visão Geral      | Resumo executivo, saúde do projeto, próximos passos, decisões recentes e indicadores do quadro. |
| Kairos           | Conversa voice-first/textual com memória e contexto daquele projeto.                            |
| Atividades       | Quadro TO DO, DOING e DONE com cards, responsáveis, checklists, labels, anexos e comentários.   |
| Conhecimento     | Documentos transcritos, uploads, conteúdos extraídos e base explícita do projeto.               |
| Decisões         | Registro estruturado de decisões com contexto, impacto, status e vínculo com artefatos/tarefas. |
| Riscos           | Riscos identificados manualmente ou sugeridos pelo Kairos, com mitigação e status.              |
| Artefatos        | Documentos do projeto, versionamento, previews e exportações.                                   |
| Histórico        | Linha do tempo de ações, conversas relevantes, alterações e automações.                         |
| Compartilhamento | Membros, papéis, convites e permissões.                                                         |

# 4. Arquitetura alvo da V2

A recomendação técnica é tratar o 7C Commander como produto principal e
incorporar os serviços do Kairos de forma modular. O ponto de atenção é
que os dois projetos usam stacks diferentes. O 7C está em React/Vite com
Vercel Functions e Prisma. O Kairos está em Next.js com App Router e
Supabase. Para evitar uma reescrita mal controlada, a V2 deve ser feita
por integração progressiva.

## 4.1 Arquitetura conceitual

| **Camada**            | **Responsabilidade**                                                                                             |
|-----------------------|------------------------------------------------------------------------------------------------------------------|
| Frontend 7C Commander | Experiência principal, navegação, clientes, projetos, workspace, artefatos, atividades e componentes visuais.    |
| Kairos UI             | Componente de voz, chat contextual, avatar/estado, histórico e comandos operacionais.                            |
| API Backend           | Autenticação, projetos, clientes, membros, artefatos, atividades, conhecimento, memória, decisões e integrações. |
| Kairos Core           | Interpretação de intenção, prompt mestre, seleção de módulos, resposta, comandos e persistência contextual.      |
| Project Resolver      | Identificação do projeto correto, confiança, sugestão/criação de projeto e isolamento contextual.                |
| Memory Layer          | Memórias, embeddings, prioridade, compressão e recuperação semântica.                                            |
| Knowledge Layer       | Conteúdo explícito do projeto, chunks, embeddings, ingestão e recuperação.                                       |
| Task Board            | TO DO, DOING, DONE, cards e detalhes operacionais.                                                               |
| Google Layer          | OAuth, Drive, Sheets, exportação, backup, anexos e compartilhamento.                                             |
| OpenAI Layer          | STT, TTS, embeddings, geração textual e análise de arquivos.                                                     |

| **Decisão técnica recomendada:** O Supabase deve ser a base operacional/cognitiva principal da V2. Google Drive e Sheets devem continuar como integração e camada de armazenamento/exportação, mas não como fonte principal da memória do Kairos. |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## 4.2 Fluxo operacional do Kairos

1.  Usuário fala ou digita na Home ou dentro de um projeto.

2.  Se for voz, o frontend captura áudio e chama STT.

3.  A mensagem textual chega ao Kairos Core com userId, conversationId e
    projectId quando houver.

4.  O Project Resolver identifica o projeto, reutiliza o projeto ativo
    ou sugere novo projeto.

5.  O Memory Layer recupera memórias relevantes por usuário e projeto.

6.  O Knowledge Layer recupera conhecimento explícito do projeto.

7.  O Task Board Context resume TO DO, DOING, DONE e cards abertos.

8.  O Capability Module correto é carregado conforme intenção: PM, BPMN,
    técnico, escrita, estudo, tradução, executivo ou planejamento.

9.  O Kairos responde e, quando aplicável, cria tarefa, registra
    decisão, salva memória, gera artefato ou atualiza contexto do
    projeto.

10. Se a sessão for voice-first, o texto de resposta é enviado para TTS
    e reproduzido ao usuário.

# 5. Modelo de dados consolidado

A V2 precisa unir entidades operacionais do 7C Commander com entidades
cognitivas do Kairos. Abaixo está a modelagem alvo recomendada para o
produto.

| **Entidade**           | **Origem**  | **Uso na V2**                                                                                    |
|------------------------|-------------|--------------------------------------------------------------------------------------------------|
| users/profiles         | 7C + Kairos | Identidade, email, avatar, preferências e vínculo com autenticação Google.                       |
| clients                | 7C          | Clientes atendidos, responsáveis e observações.                                                  |
| projects               | 7C + Kairos | Entidade central com objetivo, contexto, stakeholders, maturidade, tags, status e projeto ativo. |
| project_members        | 7C + Kairos | Compartilhamento por papel: owner, editor e viewer.                                              |
| conversations          | Kairos      | Sessões de conversa por usuário e projeto.                                                       |
| messages               | Kairos      | Histórico de mensagens com origem voice/text e especialista/módulo acionado.                     |
| memories               | Kairos      | Memória operacional contínua, com prioridade e vínculo a projeto quando aplicável.               |
| memory_embeddings      | Kairos      | Vetores para recuperação semântica de memórias.                                                  |
| knowledge_base         | Kairos      | Conhecimento explícito ensinado ou importado para o projeto.                                     |
| knowledge_chunks       | Kairos      | Fragmentos indexáveis de documentos e conteúdos.                                                 |
| knowledge_embeddings   | Kairos      | Vetores para busca semântica no conhecimento.                                                    |
| decisions              | Kairos      | Decisões estruturadas com contexto, impacto, status e projeto.                                   |
| risks                  | Kairos alvo | Riscos com impacto, probabilidade, mitigação e status.                                           |
| task_boards            | Kairos      | Quadro principal por projeto.                                                                    |
| task_columns           | Kairos      | Colunas TO DO, DOING e DONE.                                                                     |
| tasks                  | Kairos      | Cards de atividade com prioridade, status, responsável, prazo e posição.                         |
| task_details           | Kairos      | Labels, membros, checklists, comentários, anexos e log de atividade.                             |
| artifacts              | 7C          | Artefatos do projeto com tipo, formato, status, conteúdo, link e metadados.                      |
| artifact_versions      | 7C          | Histórico de versões dos artefatos.                                                              |
| agent_runs             | 7C + Kairos | Execuções de agentes/capacidades, inputs, outputs e rastreabilidade.                             |
| voice_sessions         | Kairos alvo | Sessões de voz, transcrição, duração, status e vínculo com conversa/projeto.                     |
| integration_logs       | Kairos      | Logs operacionais de integrações.                                                                |
| integration_executions | Kairos      | Execução de fluxos externos, n8n e automações.                                                   |

# 6. Requisitos funcionais da V2

| **ID** | **Requisito**                        | **Descrição**                                                                                                                      |
|--------|--------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| RF-001 | Manter login Google                  | O usuário deve continuar acessando o 7C Commander com o fluxo de autenticação já existente, preservando segurança e sessão.        |
| RF-002 | Manter gestão de clientes            | O sistema deve manter cadastro, edição, consulta e vínculo de clientes com projetos.                                               |
| RF-003 | Manter gestão de projetos            | O sistema deve manter criação, edição, status, responsável, fase, próximos passos, stakeholders e workspace do projeto.            |
| RF-004 | Redesenhar Home com Kairos           | A Home deve ter Kairos como elemento central, com voz, status visual, projeto ativo e indicadores TO DO, DOING e DONE.             |
| RF-005 | Permitir conversa por voz            | O usuário deve iniciar, pausar e finalizar conversa por voz, com captura do navegador e feedback de estado.                        |
| RF-006 | Transcrever voz                      | O sistema deve transformar áudio em texto via STT server-side.                                                                     |
| RF-007 | Responder por voz                    | O sistema deve gerar áudio da resposta do Kairos via TTS server-side.                                                              |
| RF-008 | Manter chat textual                  | O chat textual deve continuar como apoio, histórico e fallback.                                                                    |
| RF-009 | Kairos contextual por projeto        | Ao entrar em um projeto, o Kairos deve operar automaticamente com o contexto daquele projeto.                                      |
| RF-010 | Project Resolver                     | Fora do projeto, o Kairos deve tentar identificar o projeto correto, calcular confiança e sugerir criação quando necessário.       |
| RF-011 | Memória operacional                  | O sistema deve salvar, priorizar, recuperar e comprimir memórias relevantes por usuário e projeto.                                 |
| RF-012 | Conhecimento explícito               | O sistema deve permitir registrar conhecimento manualmente ou por upload, vinculado ao projeto.                                    |
| RF-013 | Ingestão de documentos               | O sistema deve importar DOCX, TXT, Markdown, JSON, XML, CSV, áudio e imagem, extrair conteúdo e salvar no conhecimento do projeto. |
| RF-014 | Atualização de projeto por documento | Após ingestão, o Kairos deve sugerir ou aplicar atualização de objetivo, contexto, stakeholders, maturidade e tags.                |
| RF-015 | Quadro de atividades                 | Cada projeto deve possuir quadro TO DO, DOING e DONE, com criação, movimentação e edição de cards.                                 |
| RF-016 | Comandos de tarefa via Kairos        | O usuário deve poder criar ou mover tarefas por comando natural de texto ou voz.                                                   |
| RF-017 | Detalhe de card                      | Cada card deve suportar descrição, prioridade, responsável, prazo, labels, checklist, comentários, anexos e histórico.             |
| RF-018 | Decisões estruturadas                | O sistema deve registrar decisões com título, contexto, motivo, impacto, status e vínculo com projeto.                             |
| RF-019 | Riscos                               | O sistema deve registrar riscos e permitir que o Kairos sugira riscos com mitigação.                                               |
| RF-020 | Artefatos versionados                | Artefatos atuais devem continuar com status, versionamento, metadados e preview.                                                   |
| RF-021 | Geração de artefatos com Kairos      | O Kairos deve gerar documentos, backlog, BPMN, relatórios e especificações a partir do contexto do projeto.                        |
| RF-022 | Salvar artefato a partir de resposta | Respostas úteis do Kairos devem poder ser salvas como artefato versionado.                                                         |
| RF-023 | Agentes como capacidades             | Agentes atuais devem ser reposicionados como módulos/capacidades internas, mantendo links externos como fallback.                  |
| RF-024 | Google Drive/Sheets                  | O sistema deve continuar permitindo integração com Drive/Sheets para exportação, backup, anexos e controle.                        |
| RF-025 | Compartilhamento                     | Projetos devem manter membros e papéis owner, editor e viewer.                                                                     |
| RF-026 | Histórico e auditoria                | Ações relevantes devem gerar histórico: conversa, tarefa, decisão, upload, artefato, compartilhamento e execução de integração.    |
| RF-027 | Daily operacional                    | O sistema deve apresentar resumo de pendências, agenda, riscos, decisões e quadro de atividades.                                   |
| RF-028 | Integrações futuras                  | Preparar camada para Gmail, Calendar, Drive, Azure DevOps e n8n de forma desacoplada.                                              |

# 7. Requisitos técnicos e decisões de arquitetura

| **Decisão**           | **Orientação**                                                                                                                                   |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Base do frontend      | Reaproveitar o frontend do 7C Commander, evoluindo componentes e telas. Evitar jogar fora o fluxo que já funciona.                               |
| Backend               | Consolidar APIs para suportar as entidades do 7C e do Kairos. Pode ser uma migração progressiva para Next.js ou uma integração modular via APIs. |
| Supabase              | Usar como base principal para memória, conhecimento, conversas, decisões, tarefas e embeddings.                                                  |
| Prisma/Postgres atual | Avaliar migração para Supabase Postgres ou manter temporariamente com camada de compatibilidade. Evitar dois bancos definitivos no longo prazo.  |
| Google Drive/Sheets   | Manter integração e provisionamento, mas como recurso complementar.                                                                              |
| OpenAI                | Usar server-side para geração, STT, TTS, embeddings e ingestão. Nunca expor chaves no frontend.                                                  |
| pgvector              | Manter como índice semântico para memória e conhecimento.                                                                                        |
| Módulos cognitivos    | Prompts especializados devem virar módulos internos, não agentes independentes.                                                                  |
| Segurança             | Todas as APIs operacionais devem validar usuário, permissão e projeto.                                                                           |
| Auditoria             | Criar logs para ações críticas e integrações.                                                                                                    |
| Testes                | Preservar Playwright E2E do 7C e incluir cenários de voz, ingestão, projeto ativo e Kanban.                                                      |

# 8. Estratégia de implementação recomendada

A recomendação é não tentar fundir os dois projetos em uma única mudança
grande. A V2 deve ser construída por fases, reduzindo risco técnico e
preservando o que já funciona.

| **Fase**                              | **Objetivo**                                   | **Entregas**                                                                                            |
|---------------------------------------|------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Fase 0 - Alinhamento técnico          | Definir stack final e estratégia de banco.     | Decisão Supabase/Prisma, mapeamento de entidades, variáveis, rotas e plano de migração.                 |
| Fase 1 - Fundação V2                  | Preparar o 7C para receber Kairos.             | Nova estrutura de serviços, Supabase, auth unificada, models de memória/conhecimento/conversas/tarefas. |
| Fase 2 - Home com Kairos              | Criar nova Home voice-first.                   | Kairos central, estados de voz, projeto ativo, indicadores TO DO/DOING/DONE, chat fallback.             |
| Fase 3 - Kairos Core no projeto       | Integrar Kairos ao workspace.                  | Aba Kairos, Project Resolver, memória e conhecimento por projeto, histórico de conversa.                |
| Fase 4 - Conhecimento e ingestão      | Permitir documentos dentro do projeto.         | Upload, transcrição, extração, chunks, embeddings, atualização de campos do projeto.                    |
| Fase 5 - Atividades                   | Adicionar quadro de atividades.                | TO DO, DOING, DONE, cards, detalhes, comandos por voz/texto.                                            |
| Fase 6 - Decisões, riscos e artefatos | Transformar conversa em estrutura operacional. | Registro de decisões, riscos, artefatos versionados gerados pelo Kairos.                                |
| Fase 7 - Agentes como capacidades     | Reposicionar agentes atuais.                   | Módulos PM, BPMN, Storyboard e Status Report como capacidades internas.                                 |
| Fase 8 - Hardening                    | Estabilizar para uso real.                     | Testes E2E, logs, permissões, tratamento de erro, observabilidade e documentação final.                 |

# 9. Backlog de User Stories para desenvolvimento

As User Stories abaixo consolidam o trabalho necessário para entregar a
V2. Elas estão organizadas em épicos para facilitar o planejamento com o
dev.

## Épico 1 - Fundação e arquitetura

| **US** | **História**                                                                                                                                        | **Critérios de aceite resumidos**                                                                             |
|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| US-001 | Como dev, quero mapear a arquitetura atual do 7C e do Kairos para definir a estrutura final da V2.                                                  | Inventário técnico concluído; dependências mapeadas; decisão de stack registrada; plano de migração aprovado. |
| US-002 | Como dev, quero configurar Supabase na V2 para suportar memória, conhecimento, conversas e atividades.                                              | Supabase conectado; variáveis seguras; pgvector ativo; healthcheck funcional.                                 |
| US-003 | Como dev, quero criar o schema consolidado da V2 para clientes, projetos, conversas, memórias, conhecimento, tarefas, decisões, riscos e artefatos. | Tabelas criadas; índices aplicados; relacionamentos validados; migrations versionadas.                        |
| US-004 | Como usuário, quero manter meu login atual para não perder a forma de acesso ao 7C Commander.                                                       | Login Google funciona; sessão segura; usuário carregado no frontend; APIs protegidas.                         |

## Épico 2 - Nova Home com Kairos

| **US** | **História**                                                                                       | **Critérios de aceite resumidos**                                                                  |
|--------|----------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| US-005 | Como usuário, quero ver o Kairos no centro da Home para iniciar meu trabalho de forma rápida.      | Home sem excesso de cards; Kairos centralizado; estados visuais exibidos; projeto ativo visível.   |
| US-006 | Como usuário, quero iniciar uma conversa por voz com o Kairos pela Home.                           | Microfone solicita permissão; gravação inicia e para; estado Ouvindo aparece; erro é tratado.      |
| US-007 | Como usuário, quero receber a resposta do Kairos em voz para usar o sistema de forma mais natural. | Resposta textual vira áudio; áudio reproduz; botão pausar/finalizar funciona; API key não exposta. |
| US-008 | Como gestor, quero ver indicadores TO DO, DOING e DONE na Home para ter noção rápida da operação.  | Indicadores carregam dados reais; respeitam usuário/projetos; atualização após mudança de tarefa.  |

## Épico 3 - Kairos contextual por projeto

| **US** | **História**                                                                              | **Critérios de aceite resumidos**                                                                       |
|--------|-------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| US-009 | Como usuário, quero que o Kairos assuma o contexto do projeto aberto automaticamente.     | Workspace envia projectId; Kairos recupera memória/conhecimento/tarefas; resposta usa contexto correto. |
| US-010 | Como usuário, quero que o Kairos identifique o projeto quando eu falar fora do workspace. | Project Resolver calcula confiança; reutiliza projeto existente; sugere novo projeto quando necessário. |
| US-011 | Como usuário, quero conversar por texto quando não puder usar voz.                        | Chat textual disponível; histórico salvo; usa mesmo contexto do Kairos Core.                            |
| US-012 | Como usuário, quero consultar o histórico de conversas do projeto.                        | Conversas listadas por projeto; mensagens ordenadas; permissão respeitada.                              |

## Épico 4 - Memória e conhecimento

| **US** | **História**                                                                                  | **Critérios de aceite resumidos**                                                            |
|--------|-----------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| US-013 | Como usuário, quero que o Kairos lembre informações importantes dos projetos.                 | Memórias salvas; prioridade atribuída; busca semântica retorna contexto relevante.           |
| US-014 | Como usuário, quero registrar conhecimento explícito no projeto.                              | Cadastro manual de conhecimento; vínculo com projeto; listagem e consulta disponíveis.       |
| US-015 | Como usuário, quero subir documentos prontos para o Kairos transcrever e estruturar.          | Upload DOCX/TXT/MD/CSV/JSON/XML/áudio/imagem; conteúdo extraído; conhecimento salvo.         |
| US-016 | Como usuário, quero que o sistema atualize campos do projeto a partir do documento importado. | Objetivo, contexto, stakeholders, maturidade e tags sugeridos/aplicados com rastreabilidade. |

## Épico 5 - Atividades e Kanban

| **US** | **História**                                                                                                | **Critérios de aceite resumidos**                                                       |
|--------|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| US-017 | Como usuário, quero ter uma tela de atividades por projeto em TO DO, DOING e DONE.                          | Quadro criado por projeto; colunas fixas; cards listados e ordenados.                   |
| US-018 | Como usuário, quero criar e mover tarefas por voz ou texto com o Kairos.                                    | Comandos criam cards; comandos movem cards; feedback claro quando não encontrar tarefa. |
| US-019 | Como usuário, quero detalhar uma atividade com responsável, prazo, checklist, labels, comentários e anexos. | Detalhe do card funcional; alterações persistidas; histórico gerado.                    |
| US-020 | Como gestor, quero que o Daily e a Home reflitam o status real das atividades.                              | Resumo considera TO DO, DOING, DONE; pendências abertas aparecem no Daily.              |

## Épico 6 - Decisões, riscos e artefatos

| **US** | **História**                                                                                               | **Critérios de aceite resumidos**                                                   |
|--------|------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| US-021 | Como usuário, quero salvar uma resposta do Kairos como decisão do projeto.                                 | Decisão criada com título, contexto, motivo, impacto e status.                      |
| US-022 | Como usuário, quero que o Kairos sugira riscos quando identificar fragilidades no projeto.                 | Riscos sugeridos; usuário confirma; risco fica vinculado ao projeto.                |
| US-023 | Como usuário, quero salvar respostas do Kairos como artefatos versionados.                                 | Artefato criado; versão inicial gerada; status e metadados preenchidos.             |
| US-024 | Como usuário, quero gerar backlog, BPMN, relatório executivo e especificação usando o contexto do projeto. | Capacidades acionadas; artefatos gerados; preview disponível; histórico registrado. |

## Épico 7 - Agentes/capacidades e integrações

| **US** | **História**                                                                            | **Critérios de aceite resumidos**                                                    |
|--------|-----------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| US-025 | Como usuário, quero continuar acessando os agentes atuais enquanto a migração acontece. | Links externos mantidos; fallback visível; configuração por variável preservada.     |
| US-026 | Como usuário, quero que os agentes virem capacidades internas do Kairos.                | Módulos PM, BPMN, Storyboard e Status carregados pelo Kairos Core conforme intenção. |
| US-027 | Como usuário, quero exportar ou armazenar artefatos no Google Drive.                    | Drive continua funcionando; arquivos exportados; links salvos no artefato.           |
| US-028 | Como administrador, quero monitorar integrações e automações.                           | Logs e execuções listadas; erros visíveis; healthcheck disponível.                   |

## Épico 8 - Segurança, testes e entrega

| **US** | **História**                                                                       | **Critérios de aceite resumidos**                                                       |
|--------|------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| US-029 | Como administrador, quero permissões por projeto para proteger dados.              | Owner/editor/viewer aplicados; APIs bloqueiam acesso indevido; membros gerenciáveis.    |
| US-030 | Como dev, quero testes E2E cobrindo o fluxo V2.                                    | Login, Home Kairos, projeto ativo, ingestão, Kanban, decisão e artefato testados.       |
| US-031 | Como dev, quero tratamento de erro padronizado para voz, OpenAI, Supabase e Drive. | Erros exibidos sem quebrar UI; logs gerados; fallback textual disponível.               |
| US-032 | Como gestor, quero documentação técnica final para operação e evolução.            | README atualizado; variáveis documentadas; endpoints listados; roteiro de teste pronto. |

# 10. APIs e serviços que devem existir na V2

| **Área**     | **Endpoints/serviços esperados**                                                                                                     |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------|
| Autenticação | GET /api/auth/me, POST /api/auth/logout, Google callback, perfil do usuário.                                                         |
| Projetos     | GET/POST /api/projects, GET/PATCH /api/projects/:id, GET/PATCH /api/projects/active.                                                 |
| Membros      | GET/POST /api/projects/:id/members, DELETE/PATCH /api/projects/:id/members/:memberId.                                                |
| Kairos Chat  | POST /api/chat, GET /api/conversations, GET /api/conversations/:id/messages.                                                         |
| Voz          | POST /api/voice/transcribe, POST /api/voice, controle de voice_sessions.                                                             |
| Memórias     | GET/POST /api/memories, GET /api/memories/relevant, POST /api/memories/compress, POST /api/memories/prioritize, feedback de memória. |
| Conhecimento | GET/POST /api/knowledge, POST /api/knowledge/ingest.                                                                                 |
| Atividades   | GET/POST /api/projects/:id/tasks, PATCH /api/tasks/:taskId, GET/PATCH /api/tasks/:taskId/details.                                    |
| Decisões     | GET/POST /api/decisions, PATCH /api/decisions/:id/status.                                                                            |
| Riscos       | GET/POST /api/projects/:id/risks, PATCH /api/risks/:id.                                                                              |
| Artefatos    | GET/POST /api/projects/:id/artifacts, PATCH /api/artifacts/:id, POST /api/artifacts/:id/version.                                     |
| Google       | Drive files, provisionamento, Sheets sync e exportação de artefatos.                                                                 |
| Integrações  | GET /api/integrations/health, Gmail, Calendar, Drive, Azure DevOps e n8n conforme fase futura.                                       |

# 11. Telas e componentes esperados

| **Tela/Componente**  | **Direcionamento**                                                                           |
|----------------------|----------------------------------------------------------------------------------------------|
| Home V2              | Kairos central, estados de voz, projeto ativo, indicadores TO DO/DOING/DONE e ações rápidas. |
| Clients              | Manter fluxo atual de clientes. Ajustar apenas visual e compatibilidade de dados.            |
| Projects             | Manter listagem e criação, incluindo campo de projeto ativo e status compatível com Kairos.  |
| ProjectWorkspace     | Adicionar abas Kairos, Atividades, Conhecimento, Decisões e Riscos.                          |
| KairosPanel          | Componente reutilizável para Home e workspace, recebendo projectId opcional.                 |
| VoiceRoom            | Captura, transcrição, resposta, reprodução, estado e controle de sessão.                     |
| TaskBoard            | Quadro Kanban com colunas e cards.                                                           |
| TaskCardDetail       | Modal/drawer de detalhe com checklists, anexos, comentários e histórico.                     |
| KnowledgePanel       | Upload, lista de conhecimentos, detalhes e status de ingestão.                               |
| DecisionPanel        | Lista, criação e atualização de decisões.                                                    |
| RiskPanel            | Lista, criação e atualização de riscos.                                                      |
| ArtifactEditorDrawer | Manter e evoluir para salvar respostas do Kairos como artefato.                              |
| Agents/Capabilities  | Tela para mostrar capacidades internas e links externos/fallback.                            |
| Settings             | Configurações de OpenAI, Drive, Supabase, voz, modelos e integrações.                        |

# 12. Critérios gerais de aceite da V2

- O sistema continua abrindo como 7C Commander.

- O login continua funcionando.

- O usuário consegue criar cliente, criar projeto e abrir workspace.

- A Home exibe Kairos como elemento central e indicadores TO DO, DOING e
  DONE.

- O usuário consegue conversar por voz com o Kairos.

- A transcrição é feita no backend e a resposta por áudio é gerada no
  backend.

- Ao abrir um projeto, o Kairos usa automaticamente o contexto daquele
  projeto.

- O usuário consegue importar documento e vê-lo registrado como
  conhecimento do projeto.

- O sistema consegue atualizar campos estruturais do projeto a partir de
  conteúdo importado, quando houver base suficiente.

- O usuário consegue criar e mover tarefas no quadro por UI e por
  comando do Kairos.

- O usuário consegue registrar decisão e risco vinculados ao projeto.

- O usuário consegue salvar resposta do Kairos como artefato versionado.

- Google Drive/Sheets continuam disponíveis como integração de apoio.

- Permissões por projeto são respeitadas.

- Fluxos críticos têm teste E2E.

- Nenhuma chave sensível fica no frontend.

# 13. Riscos técnicos e recomendações

| **Risco**                          | **Impacto**                                                  | **Mitigação**                                                                                          |
|------------------------------------|--------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| Duas stacks diferentes             | Pode gerar duplicidade e retrabalho.                         | Definir arquitetura de integração antes de codar: migrar gradualmente ou expor Kairos como módulo/API. |
| Dois modelos de persistência       | Risco de dados divergentes entre Prisma/Postgres e Supabase. | Escolher Supabase como destino da V2 e criar migração/compatibilidade temporária.                      |
| Mistura de contexto entre projetos | Pode comprometer confiança no Kairos.                        | ProjectId obrigatório no workspace, filtros por usuário/projeto e testes específicos.                  |
| Voz instável no navegador          | Pode prejudicar experiência.                                 | Manter chat textual como fallback e tratar permissões, silêncio e erros.                               |
| Custos OpenAI                      | STT, TTS, embeddings e geração podem aumentar custo.         | Configurar modelos por ambiente, limites, logs e monitoramento.                                        |
| Documentos grandes                 | Pode estourar limite de contexto.                            | Chunking, embeddings, resumo e ingestão assíncrona ou incremental.                                     |
| Agentes externos versus internos   | Pode confundir o usuário.                                    | Apresentar agentes como capacidades do Kairos, mantendo links externos apenas como fallback técnico.   |
| Segurança de integrações           | Tokens Google/OpenAI/Supabase sensíveis.                     | Somente server-side, criptografia/segredo, escopos mínimos e auditoria.                                |

# 14. Direcionamento objetivo para o dev

O desenvolvimento deve partir da premissa de que o 7C Commander atual
não será descartado. Ele será evoluído. O Kairos será incorporado como
camada cognitiva e operacional.

11. Preservar nome, login, menu lateral, clientes, projetos, artefatos,
    histórico e compartilhamento do 7C Commander.

12. Criar uma branch V2 para integrar Kairos de forma incremental.

13. Definir Supabase como base operacional/cognitiva principal da V2.

14. Migrar ou espelhar inicialmente entidades de
    projeto/cliente/artefato para compatibilidade com o modelo
    cognitivo.

15. Implementar primeiro a Home V2 com Kairos central e indicadores
    mínimos.

16. Implementar KairosPanel reutilizável para Home e ProjectWorkspace.

17. Trazer os serviços do Kairos Core, Project Resolver, Memory Layer,
    Knowledge Layer, STT, TTS e Task Board para a V2.

18. Garantir que todo endpoint receba e valide userId e projectId quando
    aplicável.

19. Adicionar a tela de Atividades ao workspace do projeto antes de
    expandir integrações futuras.

20. Tratar agentes externos atuais como fallback, enquanto os módulos
    cognitivos internos são implementados.

21. Manter Google Drive/Sheets funcionando como exportação, backup e
    armazenamento de arquivos, sem fazer deles a memória principal.

22. Criar testes E2E para o fluxo Login \> Home Kairos \> Projeto \>
    Kairos no Projeto \> Upload \> Atividades \> Artefato.

# 15. Resultado esperado da V2

Ao final da V2, o 7C Commander deve deixar de ser apenas um ambiente de
gestão de projetos com agentes externos e passar a ser uma central
operacional inteligente. O usuário deve conseguir entrar, falar com o
Kairos, escolher ou criar um projeto, subir documentos, transformar
conteúdo em conhecimento, criar atividades, registrar decisões, gerar
artefatos e manter continuidade entre conversas.

A diferença principal não está só na voz. A diferença está na
continuidade. O Kairos precisa saber em qual projeto está, o que já foi
decidido, quais documentos foram carregados, quais tarefas estão abertas
e quais artefatos já existem.

| **Conclusão executiva:** A V2 deve ser entregue como 7C Commander com Kairos integrado. O produto permanece uma plataforma de gestão de projetos. O Kairos entra como a camada que dá inteligência, memória, voz e execução contextual ao trabalho. |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# Apêndice A - Arquivos e evidências consultadas

- 7C Commander: README.md, documentos de arquitetura, fases, backend
  Google/Vercel, status local, versionamento de artefatos, roteiro E2E e
  setup local.

- 7C Commander: App.tsx, pages, components, services, backend services e
  prisma/schema.prisma.

- Kairos: README.md, documentação de direcionamento, especificação
  funcional, especificação técnica, User Stories e governança.

- Kairos: app/voice, app/chat, app/projects, app/activities, app/api,
  services/kairos-core, project-resolver, memory-service,
  knowledge-layer, knowledge-ingestion, task-board-service,
  task-card-detail-service.

- Kairos: database/schema.sql e migrations 017, 021, 029, 030, 031, 032
  e 033.
