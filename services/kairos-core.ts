import { getOpenAIClient } from "@/lib/openai";
import { listMessages } from "@/services/chat-store";
import { searchRelevantMemories, saveMemory } from "@/services/memory-service";
import { loadCapabilityModulesForMessage, loadCorePrompt } from "@/services/capability-modules";
import { listKnowledge } from "@/services/knowledge-layer";
import { listDecisions } from "@/services/decision-service";
import { getKairosProfile } from "@/services/kairos-profile-service";
import { resolveProjectContext } from "@/services/project-resolver";
import { createTaskFromKairosCommand, moveTaskFromKairosCommand } from "@/services/task-card-detail-service";
import { getProjectTaskOperationalSnapshot } from "@/services/task-board-service";
import { listRisksByProject } from "@/services/risk-service";
import { createRisk } from "@/services/risk-service";
import { SpecialistId } from "@/types/chat";
import { ProjectRecord } from "@/types/project";

const DEFAULT_SPECIALIST: SpecialistId = "core";

export function classifyIntent(message: string): SpecialistId {
  const input = message.toLowerCase();
  if (/(estudar|resumo|explicar|prova|revisao)/.test(input)) return "study";
  if (/(traduz|translation|idioma|ingles|espanhol)/.test(input)) return "translate";
  if (/(codigo|bug|api|arquitetura|deploy)/.test(input)) return "tech";
  if (/(texto|escrever|copy|artigo|post)/.test(input)) return "writer";
  return "core";
}

async function buildMemoryContext(userId: string, message: string): Promise<string> {
  const memories = await searchRelevantMemories(userId, message, 4);
  if (!memories.length) return "Sem memorias relevantes ate o momento.";

  return memories
    .map((memory, index) => `${index + 1}. [${memory.priority}] ${memory.content}`)
    .join("\n");
}

function buildProjectContext(project: ProjectRecord | null): string {
  if (!project) {
    return "Nenhum projeto ativo resolvido para esta interacao.";
  }

  return [
    `Projeto ativo: ${project.name}`,
    `Status: ${project.status}`,
    `Objetivo: ${project.objective || "Nao informado"}`,
    `Contexto: ${project.context || "Nao informado"}`,
    `Stakeholders: ${project.stakeholders || "Nao informado"}`,
    `Maturidade: ${project.maturity || "Nao informado"}`,
    `Tags: ${project.tags.length ? project.tags.join(", ") : "Sem tags"}`,
  ].join("\n");
}

function buildTaskBoardContext(snapshot: Awaited<ReturnType<typeof getProjectTaskOperationalSnapshot>>): string {
  if (!snapshot) return "Sem quadro de atividades acessivel para este contexto.";

  const openItems = snapshot.openCards.length
    ? snapshot.openCards.map((item, index) => `${index + 1}. ${item.title} [${item.priority}] (${item.status})`).join("\n")
    : "Sem cards abertos.";

  return [
    `Kanban: TO DO=${snapshot.todo}, DOING=${snapshot.doing}, DONE=${snapshot.done}`,
    `Cards abertos:\n${openItems}`,
  ].join("\n");
}

function buildDecisionContext(decisions: Awaited<ReturnType<typeof listDecisions>>): string {
  if (!decisions.length) return "Sem decisoes registradas para este contexto.";

  return decisions
    .slice(0, 6)
    .map((item, index) => {
      const context = item.context || "sem contexto";
      const impact = item.impact || "sem impacto registrado";
      return `${index + 1}. ${item.title} [${item.status}] | contexto: ${context} | impacto: ${impact}`;
    })
    .join("\n");
}

function buildRisksContext(risks: Awaited<ReturnType<typeof listRisksByProject>>): string {
  if (!risks.length) return "Sem riscos ativos registrados para este projeto.";

  return risks
    .slice(0, 5)
    .map((item, index) => {
      const owner = item.owner || "sem dono";
      const mitigation = item.mitigation || "sem mitigacao definida";
      return `${index + 1}. ${item.title} [${item.status}] dono: ${owner} | mitigacao: ${mitigation}`;
    })
    .join("\n");
}

async function buildKnowledgeContext(params: {
  userId: string;
  projectId?: string | null;
}): Promise<string> {
  const items = (await listKnowledge(params.userId, params.projectId ?? null)).slice(0, 4);
  if (!items.length) return "Sem conhecimento explicito registrado para este contexto.";

  return items
    .map((item, index) => `${index + 1}. [${item.category}] ${item.title}: ${item.content}`)
    .join("\n");
}

type GenerateParams = {
  userId: string;
  userEmail?: string | null;
  conversationId: string;
  message: string;
  selectedSpecialist?: SpecialistId;
  projectId?: string | null;
};

type TaskCommandResult = {
  handled: boolean;
  answer: string;
};

type RiskCommandResult = {
  handled: boolean;
  answer: string;
};

function normalizeLoose(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectColumnFromMessage(message: string): "todo" | "doing" | "done" {
  const normalized = normalizeLoose(message);
  if (/(doing|em andamento|fazendo)/.test(normalized)) return "doing";
  if (/(done|concluid|finalizad|pront)/.test(normalized)) return "done";
  return "todo";
}

function extractQuotedValue(message: string): string | null {
  const quote = message.match(/["'`“”](.+?)["'`“”]/);
  return quote?.[1]?.trim() || null;
}

function detectCreateTaskIntent(message: string): { title: string; columnKey: "todo" | "doing" | "done" } | null {
  const normalized = normalizeLoose(message);
  if (!/(criar|cria|adicione|adicionar|adiciona).*(tarefa|card|atividade)/.test(normalized)) return null;

  const quoted = extractQuotedValue(message);
  if (quoted) {
    return {
      title: quoted,
      columnKey: detectColumnFromMessage(message),
    };
  }

  const tail = message.match(/(?:tarefa|card|atividade)\s*[:\-]?\s*(.+)$/i)?.[1]?.trim() ?? "";
  if (!tail) return null;
  const sanitized = tail
    .replace(/\s+(em|para)\s+(to do|doing|done|em andamento|concluida|concluído|todo)\s*$/i, "")
    .trim();
  if (!sanitized) return null;

  return {
    title: sanitized.slice(0, 180),
    columnKey: detectColumnFromMessage(message),
  };
}

function detectMoveTaskIntent(message: string): { title: string; columnKey: "todo" | "doing" | "done" } | null {
  const normalized = normalizeLoose(message);
  if (!/(mover|move|movimenta|coloca|joga).*(tarefa|card|atividade)/.test(normalized)) return null;

  const quoted = extractQuotedValue(message);
  const columnKey = detectColumnFromMessage(message);
  if (quoted) {
    return { title: quoted, columnKey };
  }

  const between = message.match(/(?:tarefa|card|atividade)\s*[:\-]?\s*(.+?)\s+(?:para|em)\s+(?:to do|doing|done|em andamento|concluida|concluído|todo)/i)?.[1]?.trim();
  if (!between) return null;
  return { title: between.slice(0, 180), columnKey };
}

function detectSuggestRiskIntent(message: string): boolean {
  const normalized = normalizeLoose(message);
  return /(sugerir|sugere|sugira|quais).*(risco|riscos)/.test(normalized);
}

function detectConfirmRiskIntent(message: string): { title: string } | null {
  const normalized = normalizeLoose(message);
  if (!/(confirmar|confirmo|registrar|criar).*(risco)/.test(normalized)) return null;
  const quoted = extractQuotedValue(message);
  if (quoted) return { title: quoted.slice(0, 180) };
  const tail = message.match(/(?:risco)\s*[:\-]?\s*(.+)$/i)?.[1]?.trim() ?? "";
  if (!tail) return null;
  return { title: tail.slice(0, 180) };
}

async function maybeHandleTaskCommand(params: {
  userId: string;
  userEmail?: string | null;
  message: string;
  projectId?: string | null;
  projectName?: string | null;
}): Promise<TaskCommandResult> {
  if (!params.projectId) {
    return {
      handled: false,
      answer: "",
    };
  }

  const createIntent = detectCreateTaskIntent(params.message);
  if (createIntent) {
    const created = await createTaskFromKairosCommand({
      userId: params.userId,
      userEmail: params.userEmail,
      projectId: params.projectId,
      title: createIntent.title,
      columnKey: createIntent.columnKey,
    });

    if (!created) {
      return {
        handled: true,
        answer: "Nao consegui criar a tarefa nesse projeto. Verifique suas permissoes ou se o projeto esta acessivel.",
      };
    }

    return {
      handled: true,
      answer: `Tarefa criada: "${created.title}" em ${created.columnKey.toUpperCase()} no projeto ${params.projectName ?? "ativo"}.`,
    };
  }

  const moveIntent = detectMoveTaskIntent(params.message);
  if (moveIntent) {
    const moved = await moveTaskFromKairosCommand({
      userId: params.userId,
      userEmail: params.userEmail,
      projectId: params.projectId,
      taskTitle: moveIntent.title,
      columnKey: moveIntent.columnKey,
    });

    if (!moved) {
      return {
        handled: true,
        answer: `Nao localizei a tarefa "${moveIntent.title}" para mover para ${moveIntent.columnKey.toUpperCase()}.`,
      };
    }

    return {
      handled: true,
      answer: `Tarefa "${moved.title}" movida para ${moved.columnKey.toUpperCase()}.`,
    };
  }

  return {
    handled: false,
    answer: "",
  };
}

async function maybeHandleRiskCommand(params: {
  userId: string;
  message: string;
  projectId?: string | null;
  projectName?: string | null;
}): Promise<RiskCommandResult> {
  if (!params.projectId) {
    return {
      handled: false,
      answer: "",
    };
  }

  if (detectSuggestRiskIntent(params.message)) {
    return {
      handled: true,
      answer: [
        "## Risco identificado",
        "- Titulo: Dependencia externa sem responsavel definido",
        "- Impacto: Pode atrasar entregas e bloquear validacoes externas.",
        "- Mitigacao inicial: Definir responsavel, prazo e plano de contingencia.",
        `O registro pode ser revisado e salvo no projeto ${params.projectName ?? "ativo"}.`,
      ].join("\n"),
    };
  }

  const confirm = detectConfirmRiskIntent(params.message);
  if (confirm) {
    const created = await createRisk({
      userId: params.userId,
      projectId: params.projectId,
      title: confirm.title,
      status: "aberto",
      mitigation: "Definir responsavel e plano de mitigacao inicial.",
      owner: "",
    });
    return {
      handled: true,
      answer: `Risco registrado no projeto ${params.projectName ?? "ativo"}: "${created.title}".`,
    };
  }

  return {
    handled: false,
    answer: "",
  };
}

export async function generateKairosResponse(params: GenerateParams): Promise<{
  specialist: SpecialistId;
  answer: string;
  project: {
    id: string | null;
    name: string | null;
    confidence: number;
    action: "created" | "reused" | "suggest_new" | "none";
    suggestedName?: string;
  };
}> {
  const specialist = params.selectedSpecialist ?? classifyIntent(params.message) ?? DEFAULT_SPECIALIST;
  const [memoryContext, corePrompt, modules, projectResolution, kairosProfile] = await Promise.all([
    buildMemoryContext(params.userId, params.message),
    loadCorePrompt(),
    loadCapabilityModulesForMessage(params.message),
    resolveProjectContext({
      userId: params.userId,
      userEmail: params.userEmail,
      message: params.message,
      preferredProjectId: params.projectId ?? null,
      autoCreateOnExplicitRequest: true,
    }),
    getKairosProfile(params.userId),
  ]);

  const knowledgeContext = await buildKnowledgeContext({
    userId: params.userId,
    projectId: projectResolution.project?.id ?? null,
  });
  const decisionContext = await listDecisions(params.userId, projectResolution.project?.id ?? null);
  const taskBoardContext = projectResolution.project?.id
    ? await getProjectTaskOperationalSnapshot({
      userId: params.userId,
      userEmail: params.userEmail,
      projectId: projectResolution.project.id,
    })
    : null;
  const risksContext = projectResolution.project?.id
    ? await listRisksByProject({
      userId: params.userId,
      projectId: projectResolution.project.id,
    })
    : [];

  const taskCommand = await maybeHandleTaskCommand({
    userId: params.userId,
    userEmail: params.userEmail,
    message: params.message,
    projectId: projectResolution.project?.id ?? null,
    projectName: projectResolution.project?.name ?? null,
  });

  const riskCommand = await maybeHandleRiskCommand({
    userId: params.userId,
    message: params.message,
    projectId: projectResolution.project?.id ?? null,
    projectName: projectResolution.project?.name ?? null,
  });

  if (taskCommand.handled) {
    await saveMemory({
      userId: params.userId,
      type: "interaction",
      priority: "P2",
      content: `Comando de tarefa (${projectResolution.project?.name ?? "sem projeto"}): ${params.message}`,
    });

    return {
      specialist,
      answer: taskCommand.answer,
      project: {
        id: projectResolution.project?.id ?? null,
        name: projectResolution.project?.name ?? null,
        confidence: projectResolution.confidence,
        action: projectResolution.action,
        suggestedName: projectResolution.suggestedName,
      },
    };
  }

  if (riskCommand.handled) {
    await saveMemory({
      userId: params.userId,
      type: "interaction",
      priority: "P2",
      content: `Comando de risco (${projectResolution.project?.name ?? "sem projeto"}): ${params.message}`,
    });

    return {
      specialist,
      answer: riskCommand.answer,
      project: {
        id: projectResolution.project?.id ?? null,
        name: projectResolution.project?.name ?? null,
        confidence: projectResolution.confidence,
        action: projectResolution.action,
        suggestedName: projectResolution.suggestedName,
      },
    };
  }

  const projectContext = buildProjectContext(projectResolution.project);
  const moduleContext = modules.length
    ? modules.map((item) => `# Modulo ${item.id.toUpperCase()}\n${item.prompt}`).join("\n\n")
    : "Sem modulo especializado adicional nesta interacao.";

  const history = (
    await listMessages({
      conversationId: params.conversationId,
      userId: params.userId,
    })
  ).slice(-8);

  const historyText = history.map((item) => `${item.role.toUpperCase()}: ${item.content}`).join("\n");

  const systemPrompt = [
    corePrompt,
    "Use o contexto de memoria, projeto e modulos internos para gerar resposta contextual.",
    "Mantenha identidade unica do Kairos Core. Evite se apresentar como varios agentes separados.",
    "Quando a pergunta for simples (ex.: quem e voce), responda curto e natural.",
    "Responda em Markdown simples para facilitar a leitura: use titulos curtos (##), listas com '-' e **destaques** quando houver mais de uma informacao relevante. Para perguntas simples, responda de forma curta e conversacional, sem criar secoes artificiais.",
    "Em analises formais ou planejamentos, organize a resposta nas secoes que fizerem sentido: Contexto, Diagnostico, Riscos, Plano e Proximos passos.",
    "Quando identificar uma decisao que o operador possa querer registrar, inclua exatamente a secao '## Decisao sugerida' e uma linha '- Titulo: <titulo claro>'. Quando identificar um risco que possa ser acompanhado, inclua exatamente '## Risco identificado' e uma linha '- Titulo: <titulo claro>'. So use essas secoes quando houver uma sugestao concreta para salvar.",
    kairosProfile.instructions
      ? `Instrucoes personalizadas do operador (aplique-as quando nao conflitar com seguranca, contexto ou fatos):\n${kairosProfile.instructions}`
      : "Sem instrucoes personalizadas adicionais. Use o comportamento padrao do Kairos.",
    kairosProfile.knowledge
      ? `Conhecimento adicional informado pelo operador:\n${kairosProfile.knowledge}`
      : "Sem conhecimento adicional informado pelo operador.",
    `Resolucao de projeto: ${projectResolution.reasoning}`,
    `Confianca da resolucao: ${projectResolution.confidence.toFixed(2)}`,
    projectResolution.action === "suggest_new" && projectResolution.suggestedName
      ? `Sugestao: confirmar criacao de novo projeto "${projectResolution.suggestedName}".`
      : projectResolution.action === "created"
        ? `Projeto criado nesta interacao: ${projectResolution.project?.name ?? "Nao informado"}.`
        : "Sem sugestao de novo projeto nesta interacao.",
    `Memorias relevantes:\n${memoryContext}`,
    `Conhecimento explicito:\n${knowledgeContext}`,
    `Contexto de projeto:\n${projectContext}`,
    `Contexto de decisoes:\n${buildDecisionContext(decisionContext)}`,
    `Contexto de atividades:\n${buildTaskBoardContext(taskBoardContext)}`,
    `Contexto de riscos:\n${buildRisksContext(risksContext)}`,
    `Modulos cognitivos ativos:\n${moduleContext}`,
  ].join("\n\n");

  const openai = getOpenAIClient();
  if (!openai) {
    const fallbackAnswer = buildLocalFallbackAnswer(params.message, "OPENAI_API_KEY nao configurada.");
    await saveMemory({
      userId: params.userId,
      type: "interaction",
      priority: "P2",
      content: `Interacao core: ${params.message}`,
    });
    return {
      specialist,
      answer: fallbackAnswer,
      project: {
        id: projectResolution.project?.id ?? null,
        name: projectResolution.project?.name ?? null,
        confidence: projectResolution.confidence,
        action: projectResolution.action,
        suggestedName: projectResolution.suggestedName,
      },
    };
  }

  try {
    const response = await openai.responses.create({
      model: specialist === "tech" ? "gpt-4.1" : "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Historico recente:\n${historyText || "Sem historico"}\n\nMensagem atual:\n${params.message}`,
        },
      ],
    });

    const answer = response.output_text?.trim() || "Nao foi possivel gerar resposta.";

    await saveMemory({
      userId: params.userId,
      type: "interaction",
      priority: "P2",
      content: `Interacao core (${projectResolution.project?.name ?? "sem projeto"}): ${params.message}`,
    });

    return {
      specialist,
      answer,
      project: {
        id: projectResolution.project?.id ?? null,
        name: projectResolution.project?.name ?? null,
        confidence: projectResolution.confidence,
        action: projectResolution.action,
        suggestedName: projectResolution.suggestedName,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Falha na chamada OpenAI.";
    const fallbackAnswer = buildLocalFallbackAnswer(params.message, reason);
    await saveMemory({
      userId: params.userId,
      type: "interaction",
      priority: "P2",
      content: `Fallback core: ${params.message}`,
    });
    return {
      specialist,
      answer: fallbackAnswer,
      project: {
        id: projectResolution.project?.id ?? null,
        name: projectResolution.project?.name ?? null,
        confidence: projectResolution.confidence,
        action: projectResolution.action,
        suggestedName: projectResolution.suggestedName,
      },
    };
  }
}

function buildLocalFallbackAnswer(
  message: string,
  reason: string,
): string {
  return [
    "Kairos Core em modo local.",
    `Resposta em modo local devido a: ${reason}`,
    `Mensagem recebida: ${message}`,
    "Proximos passos: valide OPENAI_API_KEY e conectividade de rede para resposta completa.",
  ].join("\n");
}
