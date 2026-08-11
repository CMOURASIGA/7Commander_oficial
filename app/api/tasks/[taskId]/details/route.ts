import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  addTaskAttachment,
  addTaskChecklist,
  addTaskChecklistItem,
  addTaskComment,
  addTaskLabel,
  addTaskMember,
  getTaskCardDetail,
  deleteTaskComment,
  removeTaskLabel,
  removeTaskMember,
  setTaskCoreFields,
  setTaskDailySelection,
  toggleTaskChecklistItem,
  updateTaskComment,
} from "@/services/task-card-detail-service";

type ActionPayload =
  | {
    action: "update_core";
    title?: string;
    description?: string;
    priority?: "baixa" | "media" | "alta" | "critica";
    dueDate?: string | null;
    responsible?: string | null;
  }
  | { action: "add_label"; name?: string; color?: string | null }
  | { action: "remove_label"; labelId?: string }
  | { action: "add_member"; memberEmail?: string; role?: string }
  | { action: "remove_member"; memberId?: string }
  | { action: "add_checklist"; title?: string }
  | { action: "add_checklist_item"; checklistId?: string; content?: string }
  | { action: "toggle_checklist_item"; itemId?: string; done?: boolean }
  | { action: "add_comment"; content?: string }
  | { action: "update_comment"; commentId?: string; content?: string }
  | { action: "delete_comment"; commentId?: string }
  | { action: "set_daily_selection"; selected?: boolean }
  | { action: "add_attachment"; fileName?: string; fileUrl?: string; mimeType?: string | null };

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await context.params;
    const detail = await getTaskCardDetail({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      taskId: taskId.trim(),
    });
    if (!detail) {
      return NextResponse.json({ error: "Atividade nao encontrada ou sem acesso." }, { status: 404 });
    }

    return NextResponse.json({ data: detail });
  } catch (error) {
    console.error("[/api/tasks/[taskId]/details] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar detalhes da atividade." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await context.params;
    const payload = (await request.json()) as ActionPayload;
    const normalizedTaskId = taskId.trim();

    let ok = false;
    if (payload.action === "update_core") {
      const updated = await setTaskCoreFields({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        dueDate: payload.dueDate,
        responsible: payload.responsible,
      });
      ok = Boolean(updated);
    } else if (payload.action === "add_label") {
      ok = await addTaskLabel({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        name: payload.name ?? "",
        color: payload.color ?? null,
      });
    } else if (payload.action === "remove_label") {
      ok = await removeTaskLabel({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        labelId: payload.labelId ?? "",
      });
    } else if (payload.action === "add_member") {
      ok = await addTaskMember({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        memberEmail: payload.memberEmail ?? "",
        role: payload.role ?? "assignee",
      });
    } else if (payload.action === "remove_member") {
      ok = await removeTaskMember({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        memberId: payload.memberId ?? "",
      });
    } else if (payload.action === "add_checklist") {
      ok = await addTaskChecklist({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        title: payload.title ?? "",
      });
    } else if (payload.action === "add_checklist_item") {
      ok = await addTaskChecklistItem({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        checklistId: payload.checklistId ?? "",
        content: payload.content ?? "",
      });
    } else if (payload.action === "toggle_checklist_item") {
      ok = await toggleTaskChecklistItem({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        itemId: payload.itemId ?? "",
        done: Boolean(payload.done),
      });
    } else if (payload.action === "add_comment") {
      ok = await addTaskComment({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        content: payload.content ?? "",
      });
    } else if (payload.action === "update_comment") {
      ok = await updateTaskComment({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        commentId: payload.commentId ?? "",
        content: payload.content ?? "",
      });
    } else if (payload.action === "delete_comment") {
      ok = await deleteTaskComment({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        commentId: payload.commentId ?? "",
      });
    } else if (payload.action === "set_daily_selection") {
      ok = await setTaskDailySelection({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        selected: Boolean(payload.selected),
      });
    } else if (payload.action === "add_attachment") {
      ok = await addTaskAttachment({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        taskId: normalizedTaskId,
        fileName: payload.fileName ?? "",
        fileUrl: payload.fileUrl ?? "",
        mimeType: payload.mimeType ?? null,
      });
    }

    if (!ok) {
      return NextResponse.json({ error: "Acao nao aplicada na atividade." }, { status: 400 });
    }

    const detail = await getTaskCardDetail({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      taskId: normalizedTaskId,
    });
    if (!detail) {
      return NextResponse.json({ error: "Atividade nao encontrada apos atualizacao." }, { status: 404 });
    }

    return NextResponse.json({ data: detail });
  } catch (error) {
    console.error("[/api/tasks/[taskId]/details] POST error", error);
    return NextResponse.json({ error: "Erro ao atualizar detalhes da atividade." }, { status: 500 });
  }
}
