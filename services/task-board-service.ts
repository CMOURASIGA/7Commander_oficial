import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectAccessRole } from "@/services/project-service";

type ColumnKey = "todo" | "doing" | "done";
type TaskPriority = "baixa" | "media" | "alta" | "critica";
type TaskStatus = "aberta" | "em_andamento" | "concluida";
type ActivityMetadata = Record<string, unknown>;
type TaskLabelRow = {
  id: string;
  task_id: string;
  name: string;
  color: string | null;
};

type TaskBoardRow = {
  id: string;
  project_id: string;
  name: string;
};

type TaskColumnRow = {
  id: string;
  board_id: string;
  column_key: ColumnKey;
  title: string;
  position: number;
};

type TaskRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  board_id: string | null;
  column_id: string | null;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  responsavel: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

type LegacyTaskRow = {
  id: string;
  user_id?: string;
  project_id: string | null;
  titulo: string;
  descricao?: string | null;
  prioridade?: string | null;
  status?: string | null;
  responsavel?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at?: string | null;
};

async function registerTaskActivity(params: {
  taskId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actionType: string;
  actionDetail: string;
  metadata?: ActivityMetadata;
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  await supabase.from("task_activity_log").insert({
    task_id: params.taskId,
    actor_user_id: params.actorUserId ?? null,
    actor_email: params.actorEmail?.trim().toLowerCase() ?? null,
    action_type: params.actionType,
    action_detail: params.actionDetail,
    metadata: params.metadata ?? {},
  });
}

export type TaskCard = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  responsible: string | null;
  dueDate: string | null;
  position: number;
  columnId: string;
  columnKey: ColumnKey;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type TaskBoardColumn = {
  id: string;
  key: ColumnKey;
  title: string;
  position: number;
  cards: TaskCard[];
};

export type TaskBoard = {
  id: string;
  projectId: string;
  name: string;
  columns: TaskBoardColumn[];
};

export type ProjectTaskOperationalSnapshot = {
  todo: number;
  doing: number;
  done: number;
  openCards: Array<{
    title: string;
    priority: TaskPriority;
    status: TaskStatus;
  }>;
};

const DEFAULT_COLUMNS: Array<{ key: ColumnKey; title: string; position: number }> = [
  { key: "todo", title: "TO DO", position: 0 },
  { key: "doing", title: "DOING", position: 1 },
  { key: "done", title: "DONE", position: 2 },
];

function isSchemaMissingMessage(message?: string): boolean {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist") ||
    normalized.includes("column") ||
    normalized.includes("42p01")
  );
}

function legacyColumnId(columnKey: ColumnKey): string {
  return `legacy-${columnKey}`;
}

function isLegacyColumnId(value?: string | null): value is string {
  return (value ?? "").startsWith("legacy-");
}

function legacyColumnKeyFromStatus(status?: string | null): ColumnKey {
  const normalized = (status ?? "").toLowerCase().trim();
  if (normalized === "concluida") return "done";
  if (normalized === "em_andamento") return "doing";
  return "todo";
}

function normalizePriority(value: string): TaskPriority {
  if (value === "baixa" || value === "alta" || value === "critica") return value;
  return "media";
}

function statusFromColumnKey(columnKey: ColumnKey): TaskStatus {
  if (columnKey === "doing") return "em_andamento";
  if (columnKey === "done") return "concluida";
  return "aberta";
}

function mapTaskRowToCard(row: TaskRow, columnKey: ColumnKey): TaskCard {
  return {
    id: row.id,
    title: row.titulo,
    description: row.descricao ?? "",
    priority: normalizePriority(row.prioridade),
    status: row.status === "concluida" ? "concluida" : row.status === "em_andamento" ? "em_andamento" : "aberta",
    responsible: row.responsavel,
    dueDate: row.due_date,
    position: Number(row.position ?? 0),
    columnId: row.column_id ?? "",
    columnKey,
    labels: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLegacyTaskRowToCard(row: LegacyTaskRow, columnKey: ColumnKey, position: number): TaskCard {
  const normalizedPriority = normalizePriority((row.prioridade ?? "media").toLowerCase());
  const status = columnKey === "done" ? "concluida" : columnKey === "doing" ? "em_andamento" : "aberta";
  return {
    id: row.id,
    title: row.titulo,
    description: row.descricao ?? "",
    priority: normalizedPriority,
    status,
    responsible: row.responsavel ?? null,
    dueDate: row.due_date ?? null,
    position,
    columnId: legacyColumnId(columnKey),
    columnKey,
    labels: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

async function ensureColumnSet(boardId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const existing = await supabase
    .from("task_columns")
    .select("id, column_key")
    .eq("board_id", boardId);

  const keys = new Set<string>((existing.data ?? []).map((item) => item.column_key));
  const missing = DEFAULT_COLUMNS.filter((col) => !keys.has(col.key));
  if (!missing.length) return;

  await supabase.from("task_columns").insert(
    missing.map((column) => ({
      board_id: boardId,
      column_key: column.key,
      title: column.title,
      position: column.position,
    })),
  );
}

async function ensureBoard(params: {
  userId: string;
  projectId: string;
}): Promise<TaskBoardRow | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const existing = await supabase
    .from("task_boards")
    .select("id, project_id, name")
    .eq("project_id", params.projectId)
    .single();

  if (!existing.error && existing.data) {
    await ensureColumnSet(existing.data.id);
    return existing.data as TaskBoardRow;
  }

  const created = await supabase
    .from("task_boards")
    .insert({
      project_id: params.projectId,
      name: "Quadro principal",
      created_by: params.userId,
    })
    .select("id, project_id, name")
    .single();

  if (created.error || !created.data) return null;

  await ensureColumnSet(created.data.id);
  return created.data as TaskBoardRow;
}

async function normalizeColumnPositions(boardId: string, columnId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const listed = await supabase
    .from("tasks")
    .select("id, position")
    .eq("board_id", boardId)
    .eq("column_id", columnId)
    .order("position", { ascending: true });

  if (listed.error || !listed.data?.length) return;
  for (let index = 0; index < listed.data.length; index += 1) {
    const row = listed.data[index];
    if (Number(row.position) === index) continue;
    await supabase
      .from("tasks")
      .update({ position: index, updated_at: new Date().toISOString() })
      .eq("id", row.id);
  }
}

export async function listTaskBoard(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
}): Promise<TaskBoard | null> {
  const access = await getProjectAccessRole({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });
  if (access === "none") return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const board = await ensureBoard({
    userId: params.userId,
    projectId: params.projectId,
  });
  if (!board) {
    return listTaskBoardLegacy(params);
  }

  const [columnsResult, tasksResult] = await Promise.all([
    supabase
      .from("task_columns")
      .select("id, board_id, column_key, title, position")
      .eq("board_id", board.id)
      .order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, user_id, project_id, board_id, column_id, titulo, descricao, prioridade, status, responsavel, due_date, position, created_at, updated_at")
      .eq("board_id", board.id)
      .order("position", { ascending: true }),
  ]);

  if (columnsResult.error || tasksResult.error || !columnsResult.data || !tasksResult.data) {
    if (isSchemaMissingMessage(columnsResult.error?.message) || isSchemaMissingMessage(tasksResult.error?.message)) {
      return listTaskBoardLegacy(params);
    }
    return null;
  }

  const columns = (columnsResult.data as TaskColumnRow[]).map((column) => ({
    id: column.id,
    key: column.column_key,
    title: column.title,
    position: Number(column.position ?? 0),
    cards: [] as TaskCard[],
  }));

  const columnById = new Map<string, TaskBoardColumn>(columns.map((column) => [column.id, column]));
  const cardByTaskId = new Map<string, TaskCard>();
  for (const row of tasksResult.data as TaskRow[]) {
    if (!row.column_id) continue;
    const column = columnById.get(row.column_id);
    if (!column) continue;
    const card = mapTaskRowToCard(row, column.key);
    column.cards.push(card);
    cardByTaskId.set(card.id, card);
  }

  const taskIds = Array.from(cardByTaskId.keys());
  if (taskIds.length) {
    const labelsResult = await supabase
      .from("task_labels")
      .select("id, task_id, name, color")
      .in("task_id", taskIds);

    if (!labelsResult.error && labelsResult.data) {
      for (const label of labelsResult.data as TaskLabelRow[]) {
        const card = cardByTaskId.get(label.task_id);
        if (!card) continue;
        card.labels.push({
          id: label.id,
          name: label.name,
          color: label.color?.trim() || "#334155",
        });
      }
    }
  }

  for (const column of columns) {
    column.cards.sort((a, b) => a.position - b.position);
  }

  return {
    id: board.id,
    projectId: board.project_id,
    name: board.name,
    columns,
  };
}

async function listTaskBoardLegacy(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
}): Promise<TaskBoard | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const primary = await supabase
    .from("tasks")
    .select("id, user_id, project_id, titulo, descricao, prioridade, status, responsavel, due_date, created_at")
    .eq("project_id", params.projectId)
    .order("created_at", { ascending: true });

  const fallback = primary.error && isSchemaMissingMessage(primary.error.message)
    ? await supabase
      .from("tasks")
      .select("id, project_id, titulo, descricao, prioridade, status, created_at")
      .eq("project_id", params.projectId)
      .order("created_at", { ascending: true })
    : null;

  const rows = (primary.error ? fallback?.data : primary.data) as LegacyTaskRow[] | undefined;
  const error = primary.error ?? fallback?.error;
  if (error || !rows) return null;

  const columns: TaskBoardColumn[] = DEFAULT_COLUMNS.map((column) => ({
    id: legacyColumnId(column.key),
    key: column.key,
    title: column.title,
    position: column.position,
    cards: [],
  }));
  const byKey = new Map<ColumnKey, TaskBoardColumn>(columns.map((column) => [column.key, column]));

  for (const row of rows) {
    const columnKey = legacyColumnKeyFromStatus(row.status);
    const column = byKey.get(columnKey);
    if (!column) continue;
    const position = column.cards.length;
    column.cards.push(mapLegacyTaskRowToCard(row, columnKey, position));
  }

  return {
    id: `legacy-board-${params.projectId}`,
    projectId: params.projectId,
    name: "Quadro principal",
    columns,
  };
}

export async function createTaskCard(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  columnKey?: ColumnKey;
  actionSource?: "user" | "kairos";
}): Promise<TaskCard | null> {
  const access = await getProjectAccessRole({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });
  if (!(access === "owner" || access === "editor")) return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const board = await ensureBoard({
    userId: params.userId,
    projectId: params.projectId,
  });
  if (!board) {
    return createTaskCardLegacy(params);
  }

  const targetColumnKey = params.columnKey ?? "todo";
  const column = await supabase
    .from("task_columns")
    .select("id, column_key")
    .eq("board_id", board.id)
    .eq("column_key", targetColumnKey)
    .single();

  if (column.error || !column.data) {
    if (isSchemaMissingMessage(column.error?.message)) {
      return createTaskCardLegacy(params);
    }
    return null;
  }

  const maxPosition = await supabase
    .from("tasks")
    .select("position")
    .eq("board_id", board.id)
    .eq("column_id", column.data.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = Number(maxPosition.data?.position ?? -1) + 1;
  const inserted = await supabase
    .from("tasks")
    .insert({
      user_id: params.userId,
      project_id: params.projectId,
      board_id: board.id,
      column_id: column.data.id,
      titulo: params.title.trim().slice(0, 180),
      descricao: params.description?.trim() || null,
      prioridade: params.priority ?? "media",
      status: statusFromColumnKey(targetColumnKey),
      due_date: params.dueDate ?? null,
      position: nextPosition,
      updated_at: new Date().toISOString(),
    })
    .select("id, user_id, project_id, board_id, column_id, titulo, descricao, prioridade, status, responsavel, due_date, position, created_at, updated_at")
    .single();

  if (inserted.error || !inserted.data) {
    if (isSchemaMissingMessage(inserted.error?.message)) {
      return createTaskCardLegacy(params);
    }
    return null;
  }
  const card = mapTaskRowToCard(inserted.data as TaskRow, targetColumnKey);
  await registerTaskActivity({
    taskId: card.id,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "task_created",
    actionDetail: `Card criado em ${targetColumnKey.toUpperCase()}.`,
    metadata: {
      source: params.actionSource ?? "user",
      priority: card.priority,
    },
  });
  return card;
}

async function createTaskCardLegacy(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  columnKey?: ColumnKey;
  actionSource?: "user" | "kairos";
}): Promise<TaskCard | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const columnKey = params.columnKey ?? "todo";
  const status = statusFromColumnKey(columnKey);
  const insertResult = await supabase
    .from("tasks")
    .insert({
      user_id: params.userId,
      project_id: params.projectId,
      titulo: params.title.trim().slice(0, 180),
      descricao: params.description?.trim() || null,
      prioridade: params.priority ?? "media",
      status,
      responsavel: null,
      due_date: params.dueDate ?? null,
    })
    .select("id, user_id, project_id, titulo, descricao, prioridade, status, responsavel, due_date, created_at")
    .single();

  if (insertResult.error || !insertResult.data) return null;
  const listed = await supabase
    .from("tasks")
    .select("id, status")
    .eq("project_id", params.projectId)
    .eq("status", status)
    .order("created_at", { ascending: true });
  const position = listed.error || !listed.data
    ? 0
    : Math.max(
      0,
      listed.data.findIndex((item: { id: string }) => item.id === insertResult.data.id),
    );

  const card = mapLegacyTaskRowToCard(insertResult.data as LegacyTaskRow, columnKey, position);
  await registerTaskActivity({
    taskId: card.id,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "task_created",
    actionDetail: `Card criado em ${columnKey.toUpperCase()}.`,
    metadata: {
      source: params.actionSource ?? "user",
      priority: card.priority,
      mode: "legacy_tasks_only",
    },
  });
  return card;
}

export async function updateTaskCard(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  responsible?: string | null;
  columnId?: string;
  position?: number;
  actionSource?: "user" | "kairos";
}): Promise<TaskCard | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const current = await supabase
    .from("tasks")
    .select("id, user_id, project_id, board_id, column_id, titulo, descricao, prioridade, status, responsavel, due_date, position, created_at, updated_at")
    .eq("id", params.taskId)
    .single();
  if (current.error || !current.data) {
    if (isSchemaMissingMessage(current.error?.message)) {
      return updateTaskCardLegacy(params);
    }
    return null;
  }
  const task = current.data as TaskRow;
  if (!task.project_id || !task.board_id || !task.column_id) return null;

  const access = await getProjectAccessRole({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: task.project_id,
  });
  if (!(access === "owner" || access === "editor")) return null;

  let finalColumnId = task.column_id;
  let finalColumnKey: ColumnKey = "todo";
  const columnRows = await supabase
    .from("task_columns")
    .select("id, column_key")
    .eq("board_id", task.board_id);
  if (!columnRows.error && columnRows.data) {
    const foundCurrent = (columnRows.data as Array<{ id: string; column_key: ColumnKey }>)
      .find((item) => item.id === task.column_id);
    finalColumnKey = foundCurrent?.column_key ?? "todo";
  }

  if (params.columnId) {
    const foundTarget = (columnRows.data as Array<{ id: string; column_key: ColumnKey }> | undefined)
      ?.find((item) => item.id === params.columnId);
    if (!foundTarget) return null;
    finalColumnId = foundTarget.id;
    finalColumnKey = foundTarget.column_key;
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof params.title === "string") patch.titulo = params.title.trim().slice(0, 180);
  if (typeof params.description === "string") patch.descricao = params.description.trim() || null;
  if (typeof params.priority === "string") patch.prioridade = params.priority;
  if (params.dueDate !== undefined) patch.due_date = params.dueDate || null;
  if (params.responsible !== undefined) patch.responsavel = params.responsible || null;
  if (params.columnId) {
    patch.column_id = finalColumnId;
    patch.status = statusFromColumnKey(finalColumnKey);
  }
  if (Number.isInteger(params.position) && (params.position ?? 0) >= 0) {
    patch.position = params.position;
  }

  const updated = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", params.taskId)
    .select("id, user_id, project_id, board_id, column_id, titulo, descricao, prioridade, status, responsavel, due_date, position, created_at, updated_at")
    .single();

  if (updated.error || !updated.data) {
    if (isSchemaMissingMessage(updated.error?.message)) {
      return updateTaskCardLegacy(params);
    }
    return null;
  }
  await normalizeColumnPositions(task.board_id, task.column_id);
  if (finalColumnId !== task.column_id) {
    await normalizeColumnPositions(task.board_id, finalColumnId);
  }
  const card = mapTaskRowToCard(updated.data as TaskRow, finalColumnKey);

  if (params.columnId && finalColumnId !== task.column_id) {
    await registerTaskActivity({
      taskId: card.id,
      actorUserId: params.userId,
      actorEmail: params.userEmail,
      actionType: "task_moved",
      actionDetail: `Card movido para ${finalColumnKey.toUpperCase()}.`,
      metadata: {
        source: params.actionSource ?? "user",
        columnKey: finalColumnKey,
        position: card.position,
      },
    });
  } else {
    await registerTaskActivity({
      taskId: card.id,
      actorUserId: params.userId,
      actorEmail: params.userEmail,
      actionType: "task_updated",
      actionDetail: "Card atualizado.",
      metadata: {
        source: params.actionSource ?? "user",
      },
    });
  }

  return card;
}

async function updateTaskCardLegacy(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  responsible?: string | null;
  columnId?: string;
  position?: number;
  actionSource?: "user" | "kairos";
}): Promise<TaskCard | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const current = await supabase
    .from("tasks")
    .select("id, project_id, titulo, descricao, prioridade, status, responsavel, due_date, created_at")
    .eq("id", params.taskId)
    .single();
  if (current.error || !current.data || !current.data.project_id) return null;

  const access = await getProjectAccessRole({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: current.data.project_id,
  });
  if (!(access === "owner" || access === "editor")) return null;

  let nextColumnKey = legacyColumnKeyFromStatus(current.data.status);
  if (params.columnId && isLegacyColumnId(params.columnId)) {
    if (params.columnId === legacyColumnId("todo")) nextColumnKey = "todo";
    else if (params.columnId === legacyColumnId("doing")) nextColumnKey = "doing";
    else if (params.columnId === legacyColumnId("done")) nextColumnKey = "done";
  }

  const patch: {
    titulo?: string;
    descricao?: string | null;
    prioridade?: TaskPriority;
    due_date?: string | null;
    responsavel?: string | null;
    status?: TaskStatus;
  } = {};
  if (typeof params.title === "string") patch.titulo = params.title.trim().slice(0, 180);
  if (typeof params.description === "string") patch.descricao = params.description.trim() || null;
  if (typeof params.priority === "string") patch.prioridade = params.priority;
  if (params.dueDate !== undefined) patch.due_date = params.dueDate || null;
  if (params.responsible !== undefined) patch.responsavel = params.responsible || null;
  if (params.columnId && isLegacyColumnId(params.columnId)) {
    patch.status = statusFromColumnKey(nextColumnKey);
  }

  const updated = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", params.taskId)
    .select("id, project_id, titulo, descricao, prioridade, status, responsavel, due_date, created_at")
    .single();
  if (updated.error || !updated.data) return null;

  const listed = await supabase
    .from("tasks")
    .select("id, status")
    .eq("project_id", updated.data.project_id)
    .eq("status", statusFromColumnKey(nextColumnKey))
    .order("created_at", { ascending: true });
  const position = listed.error || !listed.data
    ? 0
    : Math.max(
      0,
      listed.data.findIndex((item: { id: string }) => item.id === params.taskId),
    );

  const card = mapLegacyTaskRowToCard(updated.data as LegacyTaskRow, nextColumnKey, position);
  await registerTaskActivity({
    taskId: card.id,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: params.columnId ? "task_moved" : "task_updated",
    actionDetail: params.columnId
      ? `Card movido para ${nextColumnKey.toUpperCase()}.`
      : "Card atualizado.",
    metadata: {
      source: params.actionSource ?? "user",
      mode: "legacy_tasks_only",
    },
  });
  return card;
}

export async function getProjectTaskOperationalSnapshot(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
}): Promise<ProjectTaskOperationalSnapshot | null> {
  const access = await getProjectAccessRole({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });
  if (access === "none") return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const result = await supabase
    .from("tasks")
    .select("titulo, prioridade, status")
    .eq("project_id", params.projectId)
    .order("updated_at", { ascending: false })
    .limit(300);

  if (result.error || !result.data) return null;

  let todo = 0;
  let doing = 0;
  let done = 0;
  const openCards: ProjectTaskOperationalSnapshot["openCards"] = [];

  for (const row of result.data as Array<{ titulo: string; prioridade: string; status: string }>) {
    const status = row.status === "concluida" ? "concluida" : row.status === "em_andamento" ? "em_andamento" : "aberta";
    const priority = normalizePriority(row.prioridade);
    if (status === "concluida") {
      done += 1;
    } else if (status === "em_andamento") {
      doing += 1;
    } else {
      todo += 1;
    }

    if (status !== "concluida" && openCards.length < 5) {
      openCards.push({
        title: row.titulo,
        priority,
        status,
      });
    }
  }

  return { todo, doing, done, openCards };
}

export async function getUserTaskOperationalSnapshot(userId: string): Promise<{
  todo: number;
  doing: number;
  done: number;
  openTitles: string[];
}> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { todo: 0, doing: 0, done: 0, openTitles: [] };
  }

  const result = await supabase
    .from("tasks")
    .select("titulo, status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (result.error || !result.data) {
    return { todo: 0, doing: 0, done: 0, openTitles: [] };
  }

  let todo = 0;
  let doing = 0;
  let done = 0;
  const openTitles: string[] = [];
  for (const row of result.data as Array<{ titulo: string; status: string }>) {
    const status = row.status === "concluida" ? "concluida" : row.status === "em_andamento" ? "em_andamento" : "aberta";
    if (status === "concluida") done += 1;
    else if (status === "em_andamento") doing += 1;
    else todo += 1;

    if (status !== "concluida" && openTitles.length < 4) {
      openTitles.push(row.titulo);
    }
  }

  return { todo, doing, done, openTitles };
}
