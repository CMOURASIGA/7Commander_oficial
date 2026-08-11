import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CreateRiskInput, RiskRecord, RiskStatus } from "@/types/risk";

const riskStore = new Map<string, RiskRecord[]>();
const ALLOW_LOCAL_FALLBACK = process.env.KAIROS_ENABLE_LOCAL_FALLBACK === "true";

type RiskRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  decision_id: string | null;
  task_id: string | null;
  titulo: string;
  impacto: string | null;
  probabilidade: string | null;
  mitigacao: string | null;
  responsavel: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
};

function normalizeStatus(value?: string | null): RiskStatus {
  if (value === "em_mitigacao" || value === "mitigado" || value === "encerrado") return value;
  return "aberto";
}

function mapRiskRow(row: RiskRow): RiskRecord {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id ?? null,
    title: row.titulo,
    impact: row.impacto ?? "",
    probability: row.probabilidade ?? "",
    mitigation: row.mitigacao ?? "",
    owner: row.responsavel ?? "",
    status: normalizeStatus(row.status),
    decisionId: row.decision_id ?? null,
    taskId: row.task_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function saveLocalRisk(input: CreateRiskInput): RiskRecord {
  const now = new Date().toISOString();
  const created: RiskRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    projectId: input.projectId,
    title: input.title.trim(),
    impact: input.impact?.trim() ?? "",
    probability: input.probability?.trim() ?? "",
    mitigation: input.mitigation?.trim() ?? "",
    owner: input.owner?.trim() ?? "",
    status: normalizeStatus(input.status),
    decisionId: input.decisionId?.trim() || null,
    taskId: input.taskId?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
  const current = riskStore.get(input.userId) ?? [];
  current.unshift(created);
  riskStore.set(input.userId, current.slice(0, 400));
  return created;
}

export async function listRisksByProject(params: {
  userId: string;
  projectId: string;
}): Promise<RiskRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase
      .from("risks")
      .select("id, user_id, project_id, decision_id, task_id, titulo, impacto, probabilidade, mitigacao, responsavel, status, created_at, updated_at")
      .eq("user_id", params.userId)
      .eq("project_id", params.projectId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!result.error && result.data) {
      return (result.data as RiskRow[]).map(mapRiskRow);
    }
  }

  if (!ALLOW_LOCAL_FALLBACK) return [];
  return (riskStore.get(params.userId) ?? []).filter((item) => item.projectId === params.projectId);
}

export async function listOpenRisksByUser(userId: string): Promise<RiskRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase
      .from("risks")
      .select("id, user_id, project_id, decision_id, task_id, titulo, impacto, probabilidade, mitigacao, responsavel, status, created_at, updated_at")
      .eq("user_id", userId)
      .in("status", ["aberto", "em_mitigacao"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (!result.error && result.data) {
      return (result.data as RiskRow[]).map(mapRiskRow);
    }
  }

  if (!ALLOW_LOCAL_FALLBACK) return [];
  return (riskStore.get(userId) ?? []).filter((item) => item.status === "aberto" || item.status === "em_mitigacao");
}

export async function createRisk(input: CreateRiskInput): Promise<RiskRecord> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase
      .from("risks")
      .insert({
        user_id: input.userId,
        project_id: input.projectId,
        decision_id: input.decisionId?.trim() || null,
        task_id: input.taskId?.trim() || null,
        titulo: input.title.trim(),
        impacto: input.impact?.trim() || null,
        probabilidade: input.probability?.trim() || null,
        mitigacao: input.mitigation?.trim() || null,
        responsavel: input.owner?.trim() || null,
        status: normalizeStatus(input.status),
      })
      .select("id, user_id, project_id, decision_id, task_id, titulo, impacto, probabilidade, mitigacao, responsavel, status, created_at, updated_at")
      .single();
    if (!inserted.error && inserted.data) {
      return mapRiskRow(inserted.data as RiskRow);
    }
  }

  if (ALLOW_LOCAL_FALLBACK) return saveLocalRisk(input);
  throw new Error("Falha ao criar risco no Supabase.");
}

export async function getRiskById(params: {
  userId: string;
  riskId: string;
}): Promise<RiskRecord | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase
      .from("risks")
      .select("id, user_id, project_id, decision_id, task_id, titulo, impacto, probabilidade, mitigacao, responsavel, status, created_at, updated_at")
      .eq("id", params.riskId)
      .eq("user_id", params.userId)
      .single();
    if (!result.error && result.data) {
      return mapRiskRow(result.data as RiskRow);
    }
  }

  if (!ALLOW_LOCAL_FALLBACK) return null;
  return (riskStore.get(params.userId) ?? []).find((item) => item.id === params.riskId) ?? null;
}

export async function updateRisk(params: {
  userId: string;
  riskId: string;
  patch: Partial<Pick<RiskRecord, "title" | "impact" | "probability" | "mitigation" | "owner" | "status" | "decisionId" | "taskId">>;
}): Promise<RiskRecord | null> {
  const current = await getRiskById({ userId: params.userId, riskId: params.riskId });
  if (!current) return null;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const updatePatch: {
      titulo?: string;
      impacto?: string | null;
      probabilidade?: string | null;
      mitigacao?: string | null;
      responsavel?: string | null;
      status?: RiskStatus;
      decision_id?: string | null;
      task_id?: string | null;
    } = {};
    if (typeof params.patch.title === "string") updatePatch.titulo = params.patch.title.trim();
    if (typeof params.patch.impact === "string") updatePatch.impacto = params.patch.impact.trim() || null;
    if (typeof params.patch.probability === "string") updatePatch.probabilidade = params.patch.probability.trim() || null;
    if (typeof params.patch.mitigation === "string") updatePatch.mitigacao = params.patch.mitigation.trim() || null;
    if (typeof params.patch.owner === "string") updatePatch.responsavel = params.patch.owner.trim() || null;
    if (typeof params.patch.status === "string") updatePatch.status = normalizeStatus(params.patch.status);
    if (params.patch.decisionId !== undefined) updatePatch.decision_id = params.patch.decisionId?.trim() || null;
    if (params.patch.taskId !== undefined) updatePatch.task_id = params.patch.taskId?.trim() || null;

    const updated = await supabase
      .from("risks")
      .update(updatePatch)
      .eq("id", params.riskId)
      .eq("user_id", params.userId)
      .select("id, user_id, project_id, decision_id, task_id, titulo, impacto, probabilidade, mitigacao, responsavel, status, created_at, updated_at")
      .single();

    if (!updated.error && updated.data) {
      return mapRiskRow(updated.data as RiskRow);
    }
  }

  if (!ALLOW_LOCAL_FALLBACK) return null;
  const local = riskStore.get(params.userId) ?? [];
  const target = local.find((item) => item.id === params.riskId);
  if (!target) return null;
  if (typeof params.patch.title === "string") target.title = params.patch.title.trim();
  if (typeof params.patch.impact === "string") target.impact = params.patch.impact.trim();
  if (typeof params.patch.probability === "string") target.probability = params.patch.probability.trim();
  if (typeof params.patch.mitigation === "string") target.mitigation = params.patch.mitigation.trim();
  if (typeof params.patch.owner === "string") target.owner = params.patch.owner.trim();
  if (typeof params.patch.status === "string") target.status = normalizeStatus(params.patch.status);
  if (params.patch.decisionId !== undefined) target.decisionId = params.patch.decisionId?.trim() || null;
  if (params.patch.taskId !== undefined) target.taskId = params.patch.taskId?.trim() || null;
  target.updatedAt = new Date().toISOString();
  return target;
}
