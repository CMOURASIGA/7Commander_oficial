import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectAccessRole, ProjectAccessRole } from "@/services/project-service";
import { TaskCard, createTaskCard, listTaskBoard, updateTaskCard } from "@/services/task-board-service";

type EditableRole = "owner" | "editor";

type TaskRow = {
  id: string;
  project_id: string | null;
  titulo: string;
};

type TaskLabel = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

type TaskMember = {
  id: string;
  memberEmail: string;
  role: string;
  createdAt: string;
};

type TaskChecklistItem = {
  id: string;
  content: string;
  done: boolean;
  position: number;
  createdAt: string;
};

type TaskChecklist = {
  id: string;
  title: string;
  position: number;
  items: TaskChecklistItem[];
};

type TaskComment = {
  id: string;
  authorEmail: string;
  content: string;
  createdAt: string;
};

type TaskAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
};

type TaskActivityLog = {
  id: string;
  actionType: string;
  actionDetail: string;
  actorEmail: string;
  createdAt: string;
};

export type TaskCardDetail = {
  card: TaskCard;
  accessRole: ProjectAccessRole;
  dailySelected: boolean;
  labels: TaskLabel[];
  members: TaskMember[];
  checklists: TaskChecklist[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  activity: TaskActivityLog[];
};

async function registerTaskActivity(params: {
  taskId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actionType: string;
  actionDetail: string;
  metadata?: Record<string, unknown>;
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

function canEdit(role: ProjectAccessRole): role is EditableRole {
  return role === "owner" || role === "editor";
}

async function loadTaskContext(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
}): Promise<{ task: TaskRow; accessRole: ProjectAccessRole } | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const taskResult = await supabase
    .from("tasks")
    .select("id, project_id, titulo")
    .eq("id", params.taskId)
    .single();
  if (taskResult.error || !taskResult.data || !taskResult.data.project_id) return null;

  const task = {
    ...(taskResult.data as TaskRow),
    project_id: taskResult.data.project_id as string,
  };
  const accessRole = await getProjectAccessRole({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: task.project_id,
  });
  if (accessRole === "none") return null;

  return { task, accessRole };
}

async function resolveCardByTaskId(taskId: string): Promise<TaskCard | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const row = await supabase
    .from("tasks")
    .select("id, board_id")
    .eq("id", taskId)
    .single();
  if (row.error || !row.data?.board_id) return null;

  const cardResult = await supabase
    .from("tasks")
    .select("id, titulo, descricao, prioridade, status, responsavel, due_date, position, created_at, updated_at, column_id")
    .eq("id", taskId)
    .single();
  const columnResult = await supabase
    .from("task_columns")
    .select("id, column_key")
    .eq("board_id", row.data.board_id)
    .eq("id", cardResult.data?.column_id ?? "")
    .single();

  if (cardResult.error || !cardResult.data || columnResult.error || !columnResult.data) return null;

  return {
    id: cardResult.data.id,
    title: cardResult.data.titulo,
    description: cardResult.data.descricao ?? "",
    priority:
      cardResult.data.prioridade === "baixa" ||
      cardResult.data.prioridade === "alta" ||
      cardResult.data.prioridade === "critica"
        ? cardResult.data.prioridade
        : "media",
    status:
      cardResult.data.status === "concluida"
        ? "concluida"
        : cardResult.data.status === "em_andamento"
          ? "em_andamento"
          : "aberta",
    responsible: cardResult.data.responsavel ?? null,
    dueDate: cardResult.data.due_date ?? null,
    position: Number(cardResult.data.position ?? 0),
    columnId: cardResult.data.column_id ?? "",
    columnKey: columnResult.data.column_key,
    labels: [],
    createdAt: cardResult.data.created_at,
    updatedAt: cardResult.data.updated_at,
  };
}

export async function getTaskCardDetail(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
}): Promise<TaskCardDetail | null> {
  const context = await loadTaskContext(params);
  if (!context) return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const [card, labelsRes, membersRes, checklistsRes, checklistItemsRes, commentsRes, attachmentsRes, activityRes, dailySelectionRes] =
    await Promise.all([
      resolveCardByTaskId(params.taskId),
      supabase
        .from("task_labels")
        .select("id, name, color, created_at")
        .eq("task_id", params.taskId)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_members")
        .select("id, member_email, role, created_at")
        .eq("task_id", params.taskId)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_checklists")
        .select("id, title, position")
        .eq("task_id", params.taskId)
        .order("position", { ascending: true }),
      supabase
        .from("task_checklist_items")
        .select("id, checklist_id, content, done, position, created_at")
        .eq("task_id", params.taskId)
        .order("position", { ascending: true }),
      supabase
        .from("task_comments")
        .select("id, author_email, content, created_at")
        .eq("task_id", params.taskId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("task_attachments")
        .select("id, file_name, file_url, mime_type, created_at")
        .eq("task_id", params.taskId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("task_activity_log")
        .select("id, action_type, action_detail, actor_email, created_at")
        .eq("task_id", params.taskId)
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("task_daily_selections")
        .select("task_id")
        .eq("task_id", params.taskId)
        .eq("user_id", params.userId)
        .maybeSingle(),
    ]);

  if (!card) return null;

  const checklistItemsByChecklist = new Map<string, TaskChecklistItem[]>();
  for (const row of (checklistItemsRes.data ?? []) as Array<{
    id: string;
    checklist_id: string;
    content: string;
    done: boolean;
    position: number;
    created_at: string;
  }>) {
    const current = checklistItemsByChecklist.get(row.checklist_id) ?? [];
    current.push({
      id: row.id,
      content: row.content,
      done: Boolean(row.done),
      position: Number(row.position ?? 0),
      createdAt: row.created_at,
    });
    checklistItemsByChecklist.set(row.checklist_id, current);
  }

  return {
    card,
    accessRole: context.accessRole,
    dailySelected: Boolean(dailySelectionRes.data),
    labels: ((labelsRes.data ?? []) as Array<{ id: string; name: string; color: string | null; created_at: string }>).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color ?? "#334155",
      createdAt: row.created_at,
    })),
    members: ((membersRes.data ?? []) as Array<{ id: string; member_email: string; role: string; created_at: string }>).map((row) => ({
      id: row.id,
      memberEmail: row.member_email,
      role: row.role,
      createdAt: row.created_at,
    })),
    checklists: ((checklistsRes.data ?? []) as Array<{ id: string; title: string; position: number }>).map((row) => ({
      id: row.id,
      title: row.title,
      position: Number(row.position ?? 0),
      items: (checklistItemsByChecklist.get(row.id) ?? []).sort((a, b) => a.position - b.position),
    })),
    comments: ((commentsRes.data ?? []) as Array<{ id: string; author_email: string | null; content: string; created_at: string }>).map((row) => ({
      id: row.id,
      authorEmail: row.author_email ?? "usuario",
      content: row.content,
      createdAt: row.created_at,
    })),
    attachments: ((attachmentsRes.data ?? []) as Array<{ id: string; file_name: string; file_url: string; mime_type: string | null; created_at: string }>).map((row) => ({
      id: row.id,
      fileName: row.file_name,
      fileUrl: row.file_url,
      mimeType: row.mime_type ?? "",
      createdAt: row.created_at,
    })),
    activity: ((activityRes.data ?? []) as Array<{ id: string; action_type: string; action_detail: string; actor_email: string | null; created_at: string }>).map((row) => ({
      id: row.id,
      actionType: row.action_type,
      actionDetail: row.action_detail,
      actorEmail: row.actor_email ?? "sistema",
      createdAt: row.created_at,
    })),
  };
}

export async function setTaskCoreFields(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  title?: string;
  description?: string;
  priority?: "baixa" | "media" | "alta" | "critica";
  dueDate?: string | null;
  responsible?: string | null;
}): Promise<TaskCard | null> {
  return updateTaskCard({
    userId: params.userId,
    userEmail: params.userEmail,
    taskId: params.taskId,
    title: params.title,
    description: params.description,
    priority: params.priority,
    dueDate: params.dueDate,
    responsible: params.responsible,
    actionSource: "user",
  });
}

export async function addTaskLabel(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  name: string;
  color?: string | null;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole) || !context.task.project_id) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const cleanName = params.name.trim().slice(0, 40);
  if (!cleanName) return false;
  const result = await supabase.from("task_labels").upsert(
    {
      task_id: params.taskId,
      project_id: context.task.project_id,
      name: cleanName,
      color: params.color?.trim() || null,
      created_by: params.userId,
    },
    { onConflict: "task_id,name" },
  );
  if (result.error) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "label_added",
    actionDetail: `Etiqueta adicionada: ${cleanName}.`,
  });
  return true;
}

export async function removeTaskLabel(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  labelId: string;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const removed = await supabase
    .from("task_labels")
    .delete()
    .eq("id", params.labelId)
    .eq("task_id", params.taskId)
    .select("name")
    .single();
  if (removed.error || !removed.data) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "label_removed",
    actionDetail: `Etiqueta removida: ${removed.data.name}.`,
  });
  return true;
}

export async function addTaskMember(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  memberEmail: string;
  role?: string;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole) || !context.task.project_id) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const email = params.memberEmail.trim().toLowerCase();
  if (!email) return false;

  const result = await supabase.from("task_members").upsert(
    {
      task_id: params.taskId,
      project_id: context.task.project_id,
      member_email: email,
      role: params.role?.trim() || "assignee",
      created_by: params.userId,
    },
    { onConflict: "task_id,member_email" },
  );
  if (result.error) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "member_added",
    actionDetail: `Membro associado: ${email}.`,
  });
  return true;
}

export async function removeTaskMember(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  memberId: string;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const removed = await supabase
    .from("task_members")
    .delete()
    .eq("id", params.memberId)
    .eq("task_id", params.taskId)
    .select("member_email")
    .single();
  if (removed.error || !removed.data) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "member_removed",
    actionDetail: `Membro removido: ${removed.data.member_email}.`,
  });
  return true;
}

export async function addTaskChecklist(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  title: string;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const listed = await supabase
    .from("task_checklists")
    .select("position")
    .eq("task_id", params.taskId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = Number(listed.data?.position ?? -1) + 1;

  const cleanTitle = params.title.trim().slice(0, 120);
  if (!cleanTitle) return false;

  const inserted = await supabase.from("task_checklists").insert({
    task_id: params.taskId,
    title: cleanTitle,
    position,
    created_by: params.userId,
  });
  if (inserted.error) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "checklist_added",
    actionDetail: `Checklist criada: ${cleanTitle}.`,
  });
  return true;
}

export async function addTaskChecklistItem(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  checklistId: string;
  content: string;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const listed = await supabase
    .from("task_checklist_items")
    .select("position")
    .eq("checklist_id", params.checklistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = Number(listed.data?.position ?? -1) + 1;

  const cleanContent = params.content.trim().slice(0, 240);
  if (!cleanContent) return false;

  const inserted = await supabase.from("task_checklist_items").insert({
    checklist_id: params.checklistId,
    task_id: params.taskId,
    content: cleanContent,
    done: false,
    position,
    created_by: params.userId,
  });
  if (inserted.error) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "checklist_item_added",
    actionDetail: `Item de checklist adicionado: ${cleanContent}.`,
  });
  return true;
}

export async function toggleTaskChecklistItem(params: {
  userId: string;
  userEmail?: string | null;
  itemId: string;
  done: boolean;
}): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const item = await supabase
    .from("task_checklist_items")
    .select("id, task_id, content")
    .eq("id", params.itemId)
    .single();
  if (item.error || !item.data?.task_id) return false;

  const context = await loadTaskContext({
    userId: params.userId,
    userEmail: params.userEmail,
    taskId: item.data.task_id,
  });
  if (!context || !canEdit(context.accessRole)) return false;

  const updated = await supabase
    .from("task_checklist_items")
    .update({ done: Boolean(params.done), updated_at: new Date().toISOString() })
    .eq("id", params.itemId)
    .select("id")
    .single();
  if (updated.error || !updated.data) return false;

  await registerTaskActivity({
    taskId: item.data.task_id,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "checklist_item_toggled",
    actionDetail: `${params.done ? "Concluido" : "Reaberto"} item: ${item.data.content}.`,
  });
  return true;
}

export async function addTaskComment(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  content: string;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const cleanContent = params.content.trim();
  if (!cleanContent) return false;

  const inserted = await supabase.from("task_comments").insert({
    task_id: params.taskId,
    author_user_id: params.userId,
    author_email: params.userEmail?.trim().toLowerCase() ?? null,
    content: cleanContent.slice(0, 4000),
  });
  if (inserted.error) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "comment_added",
    actionDetail: "Comentario adicionado.",
  });
  return true;
}

export async function setTaskDailySelection(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  selected: boolean;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const result = params.selected
    ? await supabase.from("task_daily_selections").upsert(
      {
        task_id: params.taskId,
        user_id: params.userId,
        project_id: context.task.project_id,
        selected_at: new Date().toISOString(),
      },
      { onConflict: "task_id,user_id" },
    )
    : await supabase
      .from("task_daily_selections")
      .delete()
      .eq("task_id", params.taskId)
      .eq("user_id", params.userId);
  if (result.error) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: params.selected ? "daily_selected" : "daily_unselected",
    actionDetail: params.selected ? "Card incluido na Daily." : "Card removido da Daily.",
  });
  return true;
}

export async function updateTaskComment(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  commentId: string;
  content: string;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const cleanContent = params.content.trim();
  if (!cleanContent) return false;

  const comment = await supabase
    .from("task_comments")
    .select("id, author_user_id")
    .eq("id", params.commentId)
    .eq("task_id", params.taskId)
    .single();
  if (comment.error || !comment.data || comment.data.author_user_id !== params.userId) return false;

  const updated = await supabase
    .from("task_comments")
    .update({ content: cleanContent.slice(0, 4000) })
    .eq("id", params.commentId)
    .eq("task_id", params.taskId)
    .select("id")
    .single();
  if (updated.error || !updated.data) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "comment_updated",
    actionDetail: "Comentario editado.",
  });
  return true;
}

export async function deleteTaskComment(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  commentId: string;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const comment = await supabase
    .from("task_comments")
    .select("id, author_user_id")
    .eq("id", params.commentId)
    .eq("task_id", params.taskId)
    .single();
  if (comment.error || !comment.data || comment.data.author_user_id !== params.userId) return false;

  const deleted = await supabase
    .from("task_comments")
    .delete()
    .eq("id", params.commentId)
    .eq("task_id", params.taskId)
    .select("id")
    .single();
  if (deleted.error || !deleted.data) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "comment_deleted",
    actionDetail: "Comentario excluido.",
  });
  return true;
}

export async function addTaskAttachment(params: {
  userId: string;
  userEmail?: string | null;
  taskId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
}): Promise<boolean> {
  const context = await loadTaskContext(params);
  if (!context || !canEdit(context.accessRole)) return false;
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const cleanName = params.fileName.trim().slice(0, 180);
  const cleanUrl = params.fileUrl.trim();
  if (!cleanName || !cleanUrl) return false;

  const inserted = await supabase.from("task_attachments").insert({
    task_id: params.taskId,
    file_name: cleanName,
    file_url: cleanUrl,
    mime_type: params.mimeType?.trim() || null,
    uploaded_by: params.userId,
  });
  if (inserted.error) return false;

  await registerTaskActivity({
    taskId: params.taskId,
    actorUserId: params.userId,
    actorEmail: params.userEmail,
    actionType: "attachment_added",
    actionDetail: `Anexo registrado: ${cleanName}.`,
  });
  return true;
}

function normalizeLoose(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function createTaskFromKairosCommand(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
  title: string;
  columnKey?: "todo" | "doing" | "done";
}): Promise<TaskCard | null> {
  return createTaskCard({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
    title: params.title,
    columnKey: params.columnKey ?? "todo",
    priority: "media",
    actionSource: "kairos",
  });
}

export async function moveTaskFromKairosCommand(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
  taskTitle: string;
  columnKey: "todo" | "doing" | "done";
}): Promise<TaskCard | null> {
  const board = await listTaskBoard({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });
  if (!board) return null;

  const normalizedTarget = normalizeLoose(params.taskTitle);
  let cardMatch: TaskCard | null = null;
  for (const column of board.columns) {
    const found = column.cards.find((card) => normalizeLoose(card.title) === normalizedTarget);
    if (found) {
      cardMatch = found;
      break;
    }
  }
  if (!cardMatch) return null;

  const targetColumn = board.columns.find((column) => column.key === params.columnKey);
  if (!targetColumn) return null;

  return updateTaskCard({
    userId: params.userId,
    userEmail: params.userEmail,
    taskId: cardMatch.id,
    columnId: targetColumn.id,
    position: targetColumn.cards.length,
    actionSource: "kairos",
  });
}
