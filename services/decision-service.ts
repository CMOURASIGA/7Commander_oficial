import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  CreateDecisionInput,
  Decision,
  DecisionStatus,
  DecisionStatusHistoryItem,
} from "@/types/decision";

const decisionStore = new Map<string, Decision[]>();
const decisionHistoryStore = new Map<string, DecisionStatusHistoryItem[]>();

function normalizeStatus(status?: string): DecisionStatus {
  if (status === "em_andamento" || status === "concluida" || status === "cancelada") return status;
  return "aberta";
}

function isSchemaMismatchMessage(message?: string): boolean {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("could not find the") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist") ||
    normalized.includes("column") ||
    normalized.includes("42p01")
  );
}

type DecisionRowBase = {
  id: string;
  user_id: string;
  titulo: string;
  motivo: string | null;
  impacto: string | null;
  status: string;
  project_id: string | null;
  conversation_id?: string | null;
  artifact_id?: string | null;
  created_at: string;
};

type DecisionRowWithContext = DecisionRowBase & {
  contexto?: string | null;
};

type DecisionStatusHistoryRow = {
  id: string;
  decision_id: string;
  user_id: string;
  previous_status: string | null;
  new_status: string;
  source: string | null;
  note: string | null;
  created_at: string;
};

function extractContextFromReason(rawReason: string): { context: string; reason: string } {
  const normalized = rawReason.trimStart();
  const lines = normalized.split(/\r?\n/);
  const firstLine = (lines[0] ?? "").trim();
  const match = firstLine.match(/^contexto:\s*(.*)$/i);
  if (!match) {
    return { context: "", reason: rawReason };
  }

  const context = (match[1] ?? "").trim();
  const reason = lines.slice(1).join("\n").trim();
  return { context, reason };
}

function mapSupabaseDecision(item: DecisionRowWithContext): Decision {
  const parsed = extractContextFromReason(item.motivo ?? "");
  const context = item.contexto ?? parsed.context;
  const reason = item.motivo ? (item.contexto ? item.motivo : parsed.reason) : "";

  return {
    id: item.id,
    userId: item.user_id,
    title: item.titulo,
    context,
    reason,
    impact: item.impacto ?? "",
    status: normalizeStatus(item.status),
    projectId: item.project_id ?? null,
    conversationId: item.conversation_id ?? null,
    artifactId: item.artifact_id ?? null,
    createdAt: item.created_at,
  };
}

function mapHistoryRow(row: DecisionStatusHistoryRow): DecisionStatusHistoryItem {
  return {
    id: row.id,
    decisionId: row.decision_id,
    userId: row.user_id,
    previousStatus: row.previous_status ? normalizeStatus(row.previous_status) : null,
    newStatus: normalizeStatus(row.new_status),
    source: row.source ?? "manual",
    note: row.note ?? "",
    createdAt: row.created_at,
  };
}

async function registerDecisionStatusHistory(params: {
  userId: string;
  decisionId: string;
  previousStatus: DecisionStatus | null;
  newStatus: DecisionStatus;
  source?: string;
  note?: string;
}) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    await supabase.from("decision_status_history").insert({
      user_id: params.userId,
      decision_id: params.decisionId,
      previous_status: params.previousStatus,
      new_status: params.newStatus,
      source: params.source?.trim() || "manual",
      note: params.note?.trim() || "",
    });
  }

  const current = decisionHistoryStore.get(params.userId) ?? [];
  current.unshift({
    id: crypto.randomUUID(),
    decisionId: params.decisionId,
    userId: params.userId,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    source: params.source?.trim() || "manual",
    note: params.note?.trim() || "",
    createdAt: new Date().toISOString(),
  });
  decisionHistoryStore.set(params.userId, current.slice(0, 600));
}

function saveLocalDecision(input: CreateDecisionInput): Decision {
  const decision: Decision = {
    id: crypto.randomUUID(),
    userId: input.userId,
    title: input.title.trim(),
    context: input.context?.trim() ?? "",
    reason: input.reason?.trim() ?? "",
    impact: input.impact?.trim() ?? "",
    status: normalizeStatus(input.status),
    projectId: input.projectId ?? null,
    conversationId: input.conversationId ?? null,
    artifactId: input.artifactId ?? null,
    createdAt: new Date().toISOString(),
  };

  const current = decisionStore.get(input.userId) ?? [];
  current.unshift(decision);
  decisionStore.set(input.userId, current.slice(0, 300));
  return decision;
}

async function createDecisionExtended(input: CreateDecisionInput): Promise<Decision | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const inserted = await supabase
    .from("decisions")
    .insert({
      user_id: input.userId,
      titulo: input.title.trim(),
      contexto: input.context?.trim() ?? null,
      motivo: input.reason?.trim() ?? null,
      impacto: input.impact?.trim() ?? null,
      status: normalizeStatus(input.status),
      project_id: input.projectId ?? null,
      conversation_id: input.conversationId ?? null,
      artifact_id: input.artifactId ?? null,
    })
    .select("id, user_id, titulo, contexto, motivo, impacto, status, project_id, conversation_id, artifact_id, created_at")
    .single();

  if (inserted.error || !inserted.data) return null;
  return mapSupabaseDecision(inserted.data);
}

async function createDecisionLegacy(input: CreateDecisionInput): Promise<Decision | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const motivo = input.context?.trim()
    ? `Contexto: ${input.context.trim()}\n${input.reason?.trim() ?? ""}`.trim()
    : input.reason?.trim() ?? null;

  const inserted = await supabase
    .from("decisions")
    .insert({
      user_id: input.userId,
      titulo: input.title.trim(),
      motivo,
      impacto: input.impact?.trim() ?? null,
      status: normalizeStatus(input.status),
      project_id: input.projectId ?? null,
    })
    .select("id, user_id, titulo, motivo, impacto, status, project_id, created_at")
    .single();

  if (inserted.error || !inserted.data) return null;
  return mapSupabaseDecision(inserted.data);
}

export async function createDecision(input: CreateDecisionInput): Promise<Decision> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const withExtended = await createDecisionExtended(input);
      if (withExtended) {
        await registerDecisionStatusHistory({
          userId: input.userId,
          decisionId: withExtended.id,
          previousStatus: null,
          newStatus: withExtended.status,
          source: input.source ?? "kairos",
          note: input.note ?? "Decisao criada.",
        });
        return withExtended;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!isSchemaMismatchMessage(message)) {
        // continue with legacy
      }
    }

    try {
      const legacy = await createDecisionLegacy(input);
      if (legacy) {
        await registerDecisionStatusHistory({
          userId: input.userId,
          decisionId: legacy.id,
          previousStatus: null,
          newStatus: legacy.status,
          source: input.source ?? "kairos",
          note: input.note ?? "Decisao criada.",
        });
        return legacy;
      }
    } catch {
      // fallback local below
    }
  }

  const local = saveLocalDecision(input);
  await registerDecisionStatusHistory({
    userId: input.userId,
    decisionId: local.id,
    previousStatus: null,
    newStatus: local.status,
    source: input.source ?? "kairos",
    note: input.note ?? "Decisao criada.",
  });
  return local;
}

async function listDecisionsExtended(params: {
  userId: string;
  projectId?: string | null;
}): Promise<Decision[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  let query = supabase
    .from("decisions")
    .select("id, user_id, titulo, contexto, motivo, impacto, status, project_id, conversation_id, artifact_id, created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  const result = await query;
  if (result.error || !result.data) return null;
  return result.data.map(mapSupabaseDecision);
}

async function listDecisionsLegacy(params: {
  userId: string;
  projectId?: string | null;
}): Promise<Decision[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  let query = supabase
    .from("decisions")
    .select("id, user_id, titulo, motivo, impacto, status, project_id, created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  const result = await query;
  if (result.error || !result.data) return null;
  return (result.data as DecisionRowBase[]).map((item) => mapSupabaseDecision(item));
}

export async function listDecisions(userId: string, projectId?: string | null): Promise<Decision[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const withExtended = await listDecisionsExtended({ userId, projectId: projectId ?? null });
      if (withExtended) return withExtended;
    } catch {
      // fallback legacy below
    }

    try {
      const legacy = await listDecisionsLegacy({ userId, projectId: projectId ?? null });
      if (legacy) return legacy;
    } catch {
      // fallback local below
    }
  }

  const local = decisionStore.get(userId) ?? [];
  return projectId ? local.filter((item) => item.projectId === projectId) : local;
}

export async function getDecisionById(params: {
  userId: string;
  decisionId: string;
}): Promise<Decision | null> {
  const all = await listDecisions(params.userId);
  return all.find((item) => item.id === params.decisionId) ?? null;
}

export async function listDecisionStatusHistory(params: {
  userId: string;
  decisionId: string;
}): Promise<DecisionStatusHistoryItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase
      .from("decision_status_history")
      .select("id, decision_id, user_id, previous_status, new_status, source, note, created_at")
      .eq("user_id", params.userId)
      .eq("decision_id", params.decisionId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!result.error && result.data) {
      return (result.data as DecisionStatusHistoryRow[]).map(mapHistoryRow);
    }
  }

  return (decisionHistoryStore.get(params.userId) ?? []).filter((item) => item.decisionId === params.decisionId);
}

export async function updateDecisionStatus(params: {
  userId: string;
  decisionId: string;
  status: DecisionStatus;
  source?: string;
  note?: string;
}): Promise<Decision | null> {
  const currentDecision = await getDecisionById({
    userId: params.userId,
    decisionId: params.decisionId,
  });
  if (!currentDecision) return null;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const updated = await supabase
        .from("decisions")
        .update({ status: normalizeStatus(params.status) })
        .eq("id", params.decisionId)
        .eq("user_id", params.userId)
        .select("id, user_id, titulo, contexto, motivo, impacto, status, project_id, conversation_id, artifact_id, created_at")
        .single();

      if (!updated.error && updated.data) {
        const mapped = mapSupabaseDecision(updated.data);
        await registerDecisionStatusHistory({
          userId: params.userId,
          decisionId: mapped.id,
          previousStatus: currentDecision.status,
          newStatus: mapped.status,
          source: params.source ?? "manual",
          note: params.note ?? "",
        });
        return mapped;
      }
    } catch {
      // fallback legacy below
    }

    try {
      const updatedLegacy = await supabase
        .from("decisions")
        .update({ status: normalizeStatus(params.status) })
        .eq("id", params.decisionId)
        .eq("user_id", params.userId)
        .select("id, user_id, titulo, motivo, impacto, status, project_id, created_at")
        .single();

      if (!updatedLegacy.error && updatedLegacy.data) {
        const mapped = mapSupabaseDecision(updatedLegacy.data as DecisionRowBase);
        await registerDecisionStatusHistory({
          userId: params.userId,
          decisionId: mapped.id,
          previousStatus: currentDecision.status,
          newStatus: mapped.status,
          source: params.source ?? "manual",
          note: params.note ?? "",
        });
        return mapped;
      }
    } catch {
      // fallback local below
    }
  }

  const current = decisionStore.get(params.userId) ?? [];
  const found = current.find((item) => item.id === params.decisionId);
  if (!found) return null;

  found.status = normalizeStatus(params.status);
  await registerDecisionStatusHistory({
    userId: params.userId,
    decisionId: found.id,
    previousStatus: currentDecision.status,
    newStatus: found.status,
    source: params.source ?? "manual",
    note: params.note ?? "",
  });
  return found;
}
