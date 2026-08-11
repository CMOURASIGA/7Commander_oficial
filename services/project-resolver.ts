import { createProject, getActiveProject, listProjects } from "@/services/project-service";
import { ProjectRecord, ResolveProjectResult } from "@/types/project";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreProjectMatch(project: ProjectRecord, message: string): number {
  const msg = normalize(message);
  const name = normalize(project.name);
  const tags = project.tags.map(normalize);
  const objective = normalize(project.objective);

  let score = 0;
  if (msg.includes(name)) score += 0.6;
  if (name.split(/\s+/).some((token) => token.length > 3 && msg.includes(token))) score += 0.2;
  if (tags.some((tag) => tag && msg.includes(tag))) score += 0.2;
  if (objective && msg.includes(objective.slice(0, Math.min(30, objective.length)))) score += 0.1;
  return Math.min(score, 0.95);
}

function sanitizeCandidateProjectName(value: string): string {
  return value
    .replace(/^(?:chamado|chamada|com nome|nome)\s+/i, "")
    .replace(/^[:\-]\s*/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .slice(0, 80);
}

function inferCandidateProjectName(message: string): string | null {
  const msg = message.trim();
  const normalized = normalize(msg);
  const explicit = normalized.match(/(?:projeto|iniciativa|ideia)\s+(?:novo|nova)?\s*(?:sobre|de)?\s*[:\-]?\s*(.+)$/i);
  if (explicit?.[1]?.trim()) return sanitizeCandidateProjectName(explicit[1]);

  const startNew = normalized.match(/(?:comecar|iniciar|abrir|criar)\s+(?:um|uma|o|a)?\s*(?:novo|nova)?\s*(?:projeto|ideia)\s*(?:sobre|de)?\s*(.+)$/i);
  if (startNew?.[1]?.trim()) return sanitizeCandidateProjectName(startNew[1]);
  return null;
}

function asksToCreateProject(message: string): boolean {
  const normalized = normalize(message);
  return /(criar|comecar|iniciar|abrir).*(projeto|ideia)/i.test(normalized);
}

export async function resolveProjectContext(params: {
  userId: string;
  userEmail?: string | null;
  message: string;
  preferredProjectId?: string | null;
  autoCreateOnExplicitRequest?: boolean;
}): Promise<ResolveProjectResult> {
  const projects = await listProjects(params.userId, params.userEmail);
  const preferredProjectId = params.preferredProjectId?.trim();

  if (preferredProjectId) {
    const preferred = projects.find((item) => item.id === preferredProjectId);
    if (preferred) {
      return {
        project: preferred,
        confidence: 1,
        action: "reused",
        reasoning: "Projeto definido explicitamente pela sessao.",
      };
    }
  }

  let best: ProjectRecord | null = null;
  let bestScore = 0;
  for (const project of projects) {
    const score = scoreProjectMatch(project, params.message);
    if (score > bestScore) {
      bestScore = score;
      best = project;
    }
  }

  if (best && bestScore >= 0.5) {
    return {
      project: best,
      confidence: bestScore,
      action: "reused",
      reasoning: "Projeto encontrado por alta similaridade contextual.",
    };
  }

  const candidateName = inferCandidateProjectName(params.message);
  const explicitRequest = asksToCreateProject(params.message);
  if (candidateName && explicitRequest && params.autoCreateOnExplicitRequest) {
    const existingByName = projects.find((item) => normalize(item.name) === normalize(candidateName));
    if (existingByName) {
      return {
        project: existingByName,
        confidence: 0.95,
        action: "reused",
        reasoning: "Projeto solicitado ja existe; reutilizando registro existente.",
      };
    }

    const created = await createProject({
      userId: params.userId,
      name: candidateName,
      description: "Projeto criado automaticamente a partir de solicitacao explicita de voz/chat.",
      context: params.message.trim(),
      status: "ativo",
      isActive: true,
    });

    return {
      project: created,
      confidence: 0.9,
      action: "created",
      reasoning: "Projeto criado automaticamente por solicitacao explicita.",
    };
  }

  const active = await getActiveProject(params.userId, params.userEmail);
  if (active && bestScore >= 0.25) {
    return {
      project: active,
      confidence: 0.45,
      action: "reused",
      reasoning: "Projeto ativo reutilizado por contexto parcial.",
    };
  }

  if (candidateName) {
    return {
      project: active,
      confidence: active ? 0.3 : 0.1,
      action: "suggest_new",
      suggestedName: candidateName,
      reasoning: "Contexto indica potencial novo projeto; confirmacao recomendada.",
    };
  }

  return {
    project: active,
    confidence: active ? 0.35 : 0,
    action: "none",
    reasoning: active
      ? "Sem match forte; mantendo projeto ativo atual."
      : "Sem projeto ativo e sem contexto suficiente para resolver automaticamente.",
  };
}
