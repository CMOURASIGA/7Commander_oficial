import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { updateTaskCard } from "@/services/task-board-service";

type UpdateTaskPayload = {
  title?: string;
  description?: string;
  priority?: "baixa" | "media" | "alta" | "critica";
  dueDate?: string | null;
  responsible?: string | null;
  columnId?: string;
  position?: number;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { taskId } = await context.params;
    if (!taskId?.trim()) {
      return NextResponse.json({ error: "Task invalida." }, { status: 400 });
    }

    const body = (await request.json()) as UpdateTaskPayload;
    const updated = await updateTaskCard({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      taskId: taskId.trim(),
      title: body.title,
      description: body.description,
      priority: body.priority,
      dueDate: body.dueDate,
      responsible: body.responsible,
      columnId: body.columnId,
      position: typeof body.position === "number" ? body.position : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Nao foi possivel atualizar a atividade." }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[/api/tasks/[taskId]] PATCH error", error);
    return NextResponse.json({ error: "Erro ao atualizar atividade." }, { status: 500 });
  }
}
