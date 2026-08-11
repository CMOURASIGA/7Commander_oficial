import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getProjectAccessRole } from "@/services/project-service";
import { createTaskCard, listTaskBoard } from "@/services/task-board-service";

type CreateTaskPayload = {
  title?: string;
  description?: string;
  priority?: "baixa" | "media" | "alta" | "critica";
  dueDate?: string | null;
  columnKey?: "todo" | "doing" | "done";
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { projectId } = await context.params;
    const normalizedProjectId = projectId.trim();
    const accessRole = await getProjectAccessRole({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: normalizedProjectId,
    });
    if (accessRole === "none") {
      return NextResponse.json({ error: "Projeto nao encontrado ou sem acesso ao quadro." }, { status: 404 });
    }

    const board = await listTaskBoard({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: normalizedProjectId,
    });
    if (!board) {
      return NextResponse.json(
        {
          error: "Quadro indisponivel. Valide as migrations 030/032/033 no Supabase para habilitar tasks, board e colunas.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      data: board,
      meta: {
        accessRole,
      },
    });
  } catch (error) {
    console.error("[/api/projects/[projectId]/tasks] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar quadro de atividades." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as CreateTaskPayload;
    const title = body.title?.trim() ?? "";
    if (!title) {
      return NextResponse.json({ error: "Campo 'title' obrigatorio." }, { status: 400 });
    }

    const { projectId } = await context.params;
    const created = await createTaskCard({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: projectId.trim(),
      title,
      description: body.description,
      priority: body.priority ?? "media",
      dueDate: body.dueDate ?? null,
      columnKey: body.columnKey ?? "todo",
    });

    if (!created) {
      return NextResponse.json({ error: "Sem permissao para criar atividade neste projeto." }, { status: 403 });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[/api/projects/[projectId]/tasks] POST error", error);
    return NextResponse.json({ error: "Erro ao criar atividade." }, { status: 500 });
  }
}
