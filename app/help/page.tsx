import Link from "next/link";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";

type HelpSection = {
  title: string;
  href: string;
  purpose: string;
  whenToUse: string;
  steps: string[];
  mockTitle: string;
  mockFields: Array<{ label: string; value: string }>;
};

const onboardingSteps = [
  "Faça login com Google para liberar o workspace completo.",
  "Cadastre o cliente antes de abrir um projeto operacional.",
  "Crie um projeto e marque-o como contexto ativo.",
  "Registre atividades, decisões e riscos dentro do projeto ativo.",
  "Use Voice Room e Chat para acelerar execução e documentação.",
];

const helpSections: HelpSection[] = [
  {
    title: "Tela inicial",
    href: "/",
    purpose: "Mostra o panorama do workspace com métricas, alertas e atalhos para o projeto ativo.",
    whenToUse: "Use no início do dia para entender status, risco e prioridades do ambiente.",
    steps: [
      "Verifique os indicadores principais do topo.",
      "Abra o projeto em risco ou sem atualização recente.",
      "Use os atalhos para ir direto para clientes, projetos ou Voice Room.",
    ],
    mockTitle: "Exemplo de leitura da dashboard",
    mockFields: [
      { label: "Projeto ativo", value: "Expansão Operacional Sul" },
      { label: "Projetos em risco", value: "2" },
      { label: "Artefatos mapeados", value: "18" },
      { label: "Próxima ação", value: "Abrir riscos do projeto ativo" },
    ],
  },
  {
    title: "Voice Room",
    href: "/voice",
    purpose: "Permite conversar por voz com o sistema, transcrever falas e registrar contexto operacional em tempo real.",
    whenToUse: "Use quando quiser conduzir reuniões rápidas, ditar contexto ou atualizar o projeto sem digitação longa.",
    steps: [
      "Selecione o projeto ativo no topo da tela.",
      "Clique no orbe do microfone para iniciar a escuta.",
      "Fale a instrução de forma objetiva e aguarde a resposta.",
      "Se necessário, complemente pelo campo de texto inferior.",
    ],
    mockTitle: "Exemplo de uso por voz",
    mockFields: [
      { label: "Projeto ativo", value: "Expansão Operacional Sul" },
      { label: "Comando dito", value: "Criar atividade para validar integração do Google Agenda" },
      { label: "Resposta esperada", value: "Atividade registrada e contexto sincronizado" },
      { label: "Modo contínuo", value: "Ativado" },
    ],
  },
  {
    title: "Chat operacional",
    href: "/chat",
    purpose: "Centraliza conversas textuais, histórico por contexto e geração de decisões a partir das respostas da IA.",
    whenToUse: "Use para análises mais longas, revisão de contexto e registro formal de decisões.",
    steps: [
      "Abra uma nova conversa ou retome uma anterior na coluna lateral.",
      "Escreva a solicitação com contexto suficiente.",
      "Analise a resposta e use o botão de salvar decisão quando fizer sentido.",
    ],
    mockTitle: "Exemplo de preenchimento de prompt",
    mockFields: [
      { label: "Mensagem", value: "Resuma riscos operacionais do projeto e proponha prioridade" },
      { label: "Projeto vinculado", value: "Expansão Operacional Sul" },
      { label: "Especialista", value: "Núcleo operacional" },
      { label: "Ação final", value: "Salvar decisão no projeto" },
    ],
  },
  {
    title: "Clientes",
    href: "/clients",
    purpose: "Cadastra a base de clientes para vincular contexto comercial e operacional aos projetos.",
    whenToUse: "Use antes de criar projetos novos ou quando precisar organizar a carteira ativa.",
    steps: [
      "Preencha nome do cliente.",
      "Informe contato principal e uma descrição objetiva.",
      "Defina o status como ativo ou inativo e salve.",
    ],
    mockTitle: "Exemplo de cadastro de cliente",
    mockFields: [
      { label: "Nome", value: "Grupo Atlas Alimentos" },
      { label: "Contato", value: "marina@atlas.com" },
      { label: "Status", value: "Ativo" },
      { label: "Descrição", value: "Cliente com operação multiunidade e demandas recorrentes" },
    ],
  },
  {
    title: "Projetos e decisões",
    href: "/projects",
    purpose: "Estrutura projetos, ingestão de documentos, riscos, decisões e compartilhamento entre membros.",
    whenToUse: "Use quando um novo contexto operacional precisar ser aberto, atualizado ou governado.",
    steps: [
      "Crie o projeto com nome e cliente vinculado.",
      "Atualize objetivo, contexto, stakeholders e maturidade.",
      "Anexe documentos relevantes para ingestão.",
      "Registre decisões e riscos dentro do projeto ativo.",
    ],
    mockTitle: "Exemplo de projeto preenchido",
    mockFields: [
      { label: "Projeto", value: "Expansão Operacional Sul" },
      { label: "Objetivo", value: "Padronizar rotinas e acelerar governança operacional" },
      { label: "Stakeholders", value: "Diretoria, Operações, TI" },
      { label: "Status", value: "Ativo" },
    ],
  },
  {
    title: "Atividades",
    href: "/activities",
    purpose: "Controla o quadro Kanban com cards, responsáveis, checklist, comentários, anexos e histórico.",
    whenToUse: "Use para tirar ações do plano e colocá-las em execução rastreável.",
    steps: [
      "Selecione o projeto ativo.",
      "Crie uma nova atividade com título claro e descrição curta.",
      "Abra o card para preencher prioridade, responsável, data e checklist.",
      "Arraste o card entre colunas conforme o andamento.",
    ],
    mockTitle: "Exemplo de card operacional",
    mockFields: [
      { label: "Título", value: "Validar fallback do login Google" },
      { label: "Responsável", value: "time.identidade@empresa.com" },
      { label: "Prioridade", value: "Alta" },
      { label: "Status", value: "Em andamento" },
    ],
  },
  {
    title: "Memória",
    href: "/memory",
    purpose: "Administra conhecimento persistido, prioridade da memória e feedback sobre utilidade do contexto.",
    whenToUse: "Use quando quiser revisar o que o sistema está carregando como contexto recorrente.",
    steps: [
      "Revise o conteúdo da memória e o tipo associado.",
      "Ajuste a prioridade conforme relevância real.",
      "Marque como útil, não útil, fixa ou obsoleta.",
    ],
    mockTitle: "Exemplo de memória útil",
    mockFields: [
      { label: "Conteúdo", value: "Projeto Atlas depende de sincronização diária com Google Agenda" },
      { label: "Prioridade", value: "P1" },
      { label: "Tipo", value: "operational_fact" },
      { label: "Ação sugerida", value: "Fixar se for regra permanente" },
    ],
  },
  {
    title: "Daily",
    href: "/daily",
    purpose: "Consolida resumo do dia, prioridades, agenda, riscos e perguntas de continuidade.",
    whenToUse: "Use no início da manhã ou antes de reuniões de acompanhamento.",
    steps: [
      "Leia o resumo do dia para contexto rápido.",
      "Passe pelas prioridades e pendências.",
      "Revise riscos e perguntas inteligentes antes da reunião.",
    ],
    mockTitle: "Exemplo de leitura da daily",
    mockFields: [
      { label: "Prioridade 1", value: "Concluir revisão do fluxo de login" },
      { label: "Pendência", value: "Validar autenticação com fallback desligado" },
      { label: "Agenda", value: "09:30 alinhamento com operações" },
      { label: "Risco", value: "Dependência externa do Google OAuth" },
    ],
  },
  {
    title: "Configurações",
    href: "/settings",
    purpose: "Valida variáveis públicas e server-side, autenticação e parâmetros de voz.",
    whenToUse: "Use quando o ambiente não estiver respondendo corretamente ou antes de publicar mudanças.",
    steps: [
      "Confirme se as variáveis públicas estão em OK.",
      "Confira as credenciais server-side necessárias.",
      "Revise autenticação do navegador e parâmetros de TTS.",
    ],
    mockTitle: "Exemplo de checagem de ambiente",
    mockFields: [
      { label: "NEXT_PUBLIC_SUPABASE_URL", value: "Configurada" },
      { label: "OPENAI_API_KEY", value: "Configurada" },
      { label: "TTS Voice", value: "sage" },
      { label: "Sessão Google", value: "Ativa" },
    ],
  },
];

export default function HelpPage() {
  return (
    <section className="space-y-5">
      <PageIntro
        eyebrow={BRAND_NAME}
        title="Ajuda guiada do sistema"
        description={`Guia prático para usar cada rotina do ${BRAND_SUBTITLE.toLowerCase()}, com explicação do objetivo de cada tela, sequência de uso e exemplos mockados de preenchimento.`}
        aside={
          <>
            <StatusPill tone="accent">{helpSections.length} rotinas mapeadas</StatusPill>
            <StatusPill tone="success">Guia operacional</StatusPill>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SurfaceCard className="h-fit p-4">
          <SectionLabel>Primeiros passos</SectionLabel>
          <h2 className="mt-2 text-base font-semibold text-(--text-primary)">Como começar a operar</h2>
          <div className="mt-4 space-y-2">
            {onboardingSteps.map((step, index) => (
              <div key={step} className="workspace-card-muted flex gap-3 px-3 py-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--accent) text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-(--text-primary)">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <SectionLabel>Navegação rápida</SectionLabel>
            {helpSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="workspace-card-muted block px-3 py-2 text-sm text-(--text-primary)"
              >
                {section.title}
              </Link>
            ))}
          </div>
        </SurfaceCard>

        <div className="space-y-4">
          {helpSections.map((section) => (
            <SurfaceCard key={section.href} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <SectionLabel>{section.title}</SectionLabel>
                  <h2 className="mt-2 text-xl font-semibold text-(--text-primary)">{section.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-(--text-secondary)">{section.purpose}</p>
                  <p className="mt-3 text-sm leading-6 text-(--text-primary)">
                    <span className="font-semibold">Quando usar:</span> {section.whenToUse}
                  </p>
                  <div className="mt-4 space-y-2">
                    {section.steps.map((step, index) => (
                      <div key={step} className="flex gap-3">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--accent-soft) text-xs font-semibold text-(--accent-strong)">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-6 text-(--text-primary)">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-w-[280px] max-w-[360px] flex-1">
                  <div className="workspace-card-muted p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-(--accent)">
                      Exemplo mockado
                    </p>
                    <h3 className="mt-2 text-sm font-semibold text-(--text-primary)">{section.mockTitle}</h3>
                    <div className="mt-4 space-y-2">
                      {section.mockFields.map((field) => (
                        <div key={field.label} className="rounded-xl border border-(--border) bg-white px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-(--text-tertiary)">
                            {field.label}
                          </p>
                          <p className="mt-1 text-sm text-(--text-primary)">{field.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link href={section.href} className="workspace-button-primary mt-3 w-full">
                    Abrir {section.title}
                  </Link>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </section>
  );
}
