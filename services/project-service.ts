import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CreateProjectInput, ProjectRecord, ProjectStatus } from "@/types/project";

const projectStore = new Map<string, ProjectRecord[]>();
const activeProjectStore = new Map<string, string>();
const ALLOW_LOCAL_FALLBACK = process.env.KAIROS_ENABLE_LOCAL_FALLBACK === "true";

type ProjectRowBase = {
  id: string;
  user_id: string;
  client_id?: string | null;
  nome: string;
  descricao: string | null;
  status: string;
  created_at: string;
};

type ProjectRowExtended = ProjectRowBase & {
  tags?: string[] | null;
  contexto?: string | null;
  objetivo?: string | null;
  stakeholders?: string | null;
  maturidade?: string | null;
  ativo?: boolean | null;
  clients?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
};

type ProjectMemberRole = "owner" | "editor" | "viewer";
export type ProjectAccessRole = ProjectMemberRole | "none";

const ROLE_WEIGHT: Record<ProjectMemberRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

function normalizeStatus(value?: string): ProjectStatus {
  if (value === "pausado" || value === "arquivado") return value;
  return "ativo";
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

function toArrayTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
}

function mapProjectRow(row: ProjectRowExtended): ProjectRecord {
  const clientRelation = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id ?? null,
    clientName: clientRelation?.nome ?? null,
    name: row.nome,
    description: row.descricao ?? "",
    tags: toArrayTags(row.tags),
    context: row.contexto ?? "",
    objective: row.objetivo ?? "",
    stakeholders: row.stakeholders ?? "",
    maturity: row.maturidade ?? "",
    status: normalizeStatus(row.status),
    isActive: Boolean(row.ativo),
    createdAt: row.created_at,
  };
}

function saveLocalProject(input: CreateProjectInput): ProjectRecord {
  const project: ProjectRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    clientId: input.clientId?.trim() || null,
    clientName: null,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    tags: input.tags ?? [],
    context: input.context?.trim() ?? "",
    objective: input.objective?.trim() ?? "",
    stakeholders: input.stakeholders?.trim() ?? "",
    maturity: input.maturity?.trim() ?? "",
    status: normalizeStatus(input.status),
    isActive: Boolean(input.isActive),
    createdAt: new Date().toISOString(),
  };

  const current = projectStore.get(input.userId) ?? [];
  if (project.isActive) {
    for (const item of current) item.isActive = false;
    activeProjectStore.set(input.userId, project.id);
  }
  current.unshift(project);
  projectStore.set(input.userId, current.slice(0, 200));
  return project;
}

async function listSharedProjectIds(params: {
  userId: string;
  userEmail?: string | null;
}): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const ids = new Set<string>();
  const byUser = await supabase
    .from("project_members")
    .select("project_id")
    .eq("member_user_id", params.userId)
    .neq("status", "revoked");

  if (!byUser.error && byUser.data) {
    for (const item of byUser.data as Array<{ project_id: string }>) {
      if (item.project_id) ids.add(item.project_id);
    }
  }

  const email = params.userEmail?.trim().toLowerCase();
  if (email) {
    const byEmail = await supabase
      .from("project_members")
      .select("project_id")
      .eq("member_email", email)
      .neq("status", "revoked");
    if (!byEmail.error && byEmail.data) {
      for (const item of byEmail.data as Array<{ project_id: string }>) {
        if (item.project_id) ids.add(item.project_id);
      }
    }
  }

  return Array.from(ids);
}

async function listProjectsWithAccessFilter(params: {
  userId: string;
  userEmail?: string | null;
  extended: boolean;
}): Promise<ProjectRecord[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const sharedIds = await listSharedProjectIds({
    userId: params.userId,
    userEmail: params.userEmail,
  });
  let query = params.extended
    ? supabase
      .from("projects")
      .select("id, user_id, client_id, nome, descricao, status, tags, contexto, objetivo, stakeholders, maturidade, ativo, created_at, clients(nome)")
      .order("created_at", { ascending: false })
      .limit(200)
    : supabase
      .from("projects")
      .select("id, user_id, nome, descricao, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
  if (sharedIds.length > 0) {
    query = query.or(`user_id.eq.${params.userId},id.in.(${sharedIds.join(",")})`);
  } else {
    query = query.eq("user_id", params.userId);
  }

  const result = await query;
  if (result.error || !result.data) return null;
  return (result.data as unknown as ProjectRowExtended[]).map(mapProjectRow);
}

async function getMembershipRole(params: {
  projectId: string;
  userId: string;
  userEmail?: string | null;
}): Promise<ProjectMemberRole | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const result = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", params.projectId)
    .neq("status", "revoked")
    .or([
      `member_user_id.eq.${params.userId}`,
      params.userEmail?.trim() ? `member_email.eq.${params.userEmail.trim().toLowerCase()}` : "",
    ].filter(Boolean).join(","));

  if (result.error || !result.data?.length) return null;

  let best: ProjectMemberRole | null = null;
  for (const row of result.data as Array<{ role: ProjectMemberRole }>) {
    if (!best || ROLE_WEIGHT[row.role] > ROLE_WEIGHT[best]) {
      best = row.role;
    }
  }
  return best;
}

export async function getProjectAccessRole(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
}): Promise<ProjectAccessRole> {
  const project = await getProjectById({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });
  if (!project) return "none";
  if (project.userId === params.userId) return "owner";

  const role = await getMembershipRole({
    projectId: params.projectId,
    userId: params.userId,
    userEmail: params.userEmail,
  });
  return role ?? "viewer";
}

async function canEditProject(params: {
  projectId: string;
  userId: string;
  userEmail?: string | null;
}): Promise<boolean> {
  const role = await getMembershipRole(params);
  return role === "owner" || role === "editor";
}

export async function listProjects(userId: string, userEmail?: string | null): Promise<ProjectRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const extended = await listProjectsWithAccessFilter({
        userId,
        userEmail,
        extended: true,
      });
      if (extended) return extended;
    } catch {
      // fallback legacy below
    }

    try {
      const legacy = await listProjectsWithAccessFilter({
        userId,
        userEmail,
        extended: false,
      });
      if (legacy) return legacy;
    } catch {
      // fallback local below
    }
  }

  return ALLOW_LOCAL_FALLBACK ? projectStore.get(userId) ?? [] : [];
}

async function createProjectExtended(input: CreateProjectInput): Promise<ProjectRecord | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  if (input.isActive) {
    await supabase
      .from("projects")
      .update({ ativo: false })
      .eq("user_id", input.userId)
      .eq("ativo", true);
  }

  const inserted = await supabase
    .from("projects")
    .insert({
      user_id: input.userId,
      client_id: input.clientId?.trim() || null,
      nome: input.name.trim(),
      descricao: input.description?.trim() || null,
      tags: input.tags?.length ? input.tags : null,
      contexto: input.context?.trim() || null,
      objetivo: input.objective?.trim() || null,
      stakeholders: input.stakeholders?.trim() || null,
      maturidade: input.maturity?.trim() || null,
      status: normalizeStatus(input.status),
      ativo: Boolean(input.isActive),
    })
    .select("id, user_id, client_id, nome, descricao, status, tags, contexto, objetivo, stakeholders, maturidade, ativo, created_at, clients(nome)")
    .single();

  if (inserted.error || !inserted.data) return null;
  return mapProjectRow(inserted.data);
}

async function createProjectLegacy(input: CreateProjectInput): Promise<ProjectRecord | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const withClient = await supabase
    .from("projects")
    .insert({
      user_id: input.userId,
      client_id: input.clientId?.trim() || null,
      nome: input.name.trim(),
      descricao: input.description?.trim() || null,
      status: normalizeStatus(input.status),
    })
    .select("id, user_id, client_id, nome, descricao, status, created_at")
    .single();

  if (!withClient.error && withClient.data) {
    return mapProjectRow(withClient.data as ProjectRowBase);
  }

  if (!isSchemaMismatchMessage(withClient.error?.message)) return null;

  const legacy = await supabase
    .from("projects")
    .insert({
      user_id: input.userId,
      nome: input.name.trim(),
      descricao: input.description?.trim() || null,
      status: normalizeStatus(input.status),
    })
    .select("id, user_id, nome, descricao, status, created_at")
    .single();

  if (legacy.error || !legacy.data) return null;
  return mapProjectRow(legacy.data as ProjectRowBase);
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const created = await createProjectExtended(input);
      if (created) {
        if (input.isActive) {
          activeProjectStore.set(input.userId, created.id);
        }
        return created;
      }
    } catch {
      // fallback legacy below
    }

    try {
      const created = await createProjectLegacy(input);
      if (created) {
        if (input.isActive) {
          activeProjectStore.set(input.userId, created.id);
        }
        return created;
      }
    } catch {
      // fallback local below
    }
  }

  if (ALLOW_LOCAL_FALLBACK) {
    return saveLocalProject(input);
  }

  throw new Error("Falha ao criar projeto no Supabase. Habilite KAIROS_ENABLE_LOCAL_FALLBACK=true para modo local.");
}

export async function setActiveProject(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
}): Promise<ProjectRecord | null> {
  const accessible = await getProjectById({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });
  if (!accessible) return null;
  activeProjectStore.set(params.userId, params.projectId);

  if (accessible.userId !== params.userId) {
    return accessible;
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("projects").update({ ativo: false }).eq("user_id", params.userId).eq("ativo", true);

      const updated = await supabase
        .from("projects")
        .update({ ativo: true })
        .eq("id", params.projectId)
        .eq("user_id", params.userId)
        .select("id, user_id, client_id, nome, descricao, status, tags, contexto, objetivo, stakeholders, maturidade, ativo, created_at, clients(nome)")
        .single();

      if (!updated.error && updated.data) {
        return mapProjectRow(updated.data);
      }
    } catch {
      // fallback local below
    }
  }

  if (!ALLOW_LOCAL_FALLBACK) return accessible;
  const local = projectStore.get(params.userId) ?? [];
  let found: ProjectRecord | null = null;
  for (const item of local) {
    item.isActive = item.id === params.projectId;
    if (item.isActive) found = item;
  }

  if (found) activeProjectStore.set(params.userId, params.projectId);
  return found;
}

export async function getActiveProject(userId: string, userEmail?: string | null): Promise<ProjectRecord | null> {
  const projects = await listProjects(userId, userEmail);
  const stored = activeProjectStore.get(userId);
  if (stored) {
    const found = projects.find((item) => item.id === stored);
    if (found) return found;
    activeProjectStore.delete(userId);
  }

  const explicitOwned = projects.find((item) => item.isActive && item.userId === userId);
  if (explicitOwned) return explicitOwned;

  const explicitAny = projects.find((item) => item.isActive);
  if (explicitAny) return explicitAny;

  return projects[0] ?? null;
}

export async function getProjectById(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
}): Promise<ProjectRecord | null> {
  const projects = await listProjects(params.userId, params.userEmail);
  return projects.find((item) => item.id === params.projectId) ?? null;
}

export async function updateProject(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
  patch: Partial<
    Pick<ProjectRecord, "clientId" | "name" | "description" | "tags" | "context" | "objective" | "stakeholders" | "maturity" | "status">
  >;
}): Promise<ProjectRecord | null> {
  const current = await getProjectById({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });
  if (!current) return null;

  const editableByMember = current.userId !== params.userId
    ? await canEditProject({
      projectId: params.projectId,
      userId: params.userId,
      userEmail: params.userEmail,
    })
    : true;
  if (!editableByMember) return null;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const nameValue = typeof params.patch.name === "string" ? params.patch.name.trim() : undefined;
    const descriptionValue =
      typeof params.patch.description === "string" ? params.patch.description.trim() || null : undefined;
    const tagsValue = Array.isArray(params.patch.tags)
      ? (params.patch.tags.length ? params.patch.tags : null)
      : undefined;
    const contextValue = typeof params.patch.context === "string" ? params.patch.context.trim() || null : undefined;
    const objectiveValue =
      typeof params.patch.objective === "string" ? params.patch.objective.trim() || null : undefined;
    const stakeholdersValue =
      typeof params.patch.stakeholders === "string" ? params.patch.stakeholders.trim() || null : undefined;
    const maturityValue =
      typeof params.patch.maturity === "string" ? params.patch.maturity.trim() || null : undefined;
    const statusValue =
      typeof params.patch.status === "string" ? normalizeStatus(params.patch.status) : undefined;
    const clientIdValue =
      params.patch.clientId === undefined ? undefined : params.patch.clientId?.trim() || null;

    try {
      const dbPatch: {
        client_id?: string | null;
        nome?: string;
        descricao?: string | null;
        tags?: string[] | null;
        contexto?: string | null;
        objetivo?: string | null;
        stakeholders?: string | null;
        maturidade?: string | null;
        status?: ProjectStatus;
      } = {};

      if (nameValue !== undefined) dbPatch.nome = nameValue;
      if (descriptionValue !== undefined) dbPatch.descricao = descriptionValue;
      if (tagsValue !== undefined) dbPatch.tags = tagsValue;
      if (contextValue !== undefined) dbPatch.contexto = contextValue;
      if (objectiveValue !== undefined) dbPatch.objetivo = objectiveValue;
      if (stakeholdersValue !== undefined) dbPatch.stakeholders = stakeholdersValue;
      if (maturityValue !== undefined) dbPatch.maturidade = maturityValue;
      if (statusValue !== undefined) dbPatch.status = statusValue;
      if (clientIdValue !== undefined) dbPatch.client_id = clientIdValue;

      let query = supabase
        .from("projects")
        .update(dbPatch)
        .eq("id", params.projectId);

      if (current.userId === params.userId) {
        query = query.eq("user_id", params.userId);
      }

      const updated = await query
        .select("id, user_id, client_id, nome, descricao, status, tags, contexto, objetivo, stakeholders, maturidade, ativo, created_at, clients(nome)")
        .single();

      if (!updated.error && updated.data) {
        return mapProjectRow(updated.data);
      }

      const shouldTryLegacy = isSchemaMismatchMessage(updated.error?.message);
      if (!shouldTryLegacy) return null;

      const legacyPatch: {
        nome?: string;
        descricao?: string | null;
        status?: ProjectStatus;
      } = {};
      if (nameValue !== undefined) legacyPatch.nome = nameValue;
      if (descriptionValue !== undefined) legacyPatch.descricao = descriptionValue;
      if (statusValue !== undefined) legacyPatch.status = statusValue;

      if (!Object.keys(legacyPatch).length) {
        return current;
      }

      let legacyQuery = supabase
        .from("projects")
        .update(legacyPatch)
        .eq("id", params.projectId);
      if (current.userId === params.userId) {
        legacyQuery = legacyQuery.eq("user_id", params.userId);
      }

      const legacyUpdated = await legacyQuery
        .select("id, user_id, nome, descricao, status, created_at")
        .single();

      if (!legacyUpdated.error && legacyUpdated.data) {
        return mapProjectRow(legacyUpdated.data as ProjectRowBase);
      }
    } catch {
      // fallback local below
    }
  }

  if (!ALLOW_LOCAL_FALLBACK) return null;
  const local = projectStore.get(params.userId) ?? [];
  const target = local.find((item) => item.id === params.projectId);
  if (!target) return null;

  if (typeof params.patch.name === "string") target.name = params.patch.name.trim();
  if (params.patch.clientId !== undefined) target.clientId = params.patch.clientId?.trim() || null;
  if (typeof params.patch.description === "string") target.description = params.patch.description.trim();
  if (Array.isArray(params.patch.tags)) target.tags = params.patch.tags;
  if (typeof params.patch.context === "string") target.context = params.patch.context.trim();
  if (typeof params.patch.objective === "string") target.objective = params.patch.objective.trim();
  if (typeof params.patch.stakeholders === "string") target.stakeholders = params.patch.stakeholders.trim();
  if (typeof params.patch.maturity === "string") target.maturity = params.patch.maturity.trim();
  if (typeof params.patch.status === "string") target.status = normalizeStatus(params.patch.status);
  return target;
}
