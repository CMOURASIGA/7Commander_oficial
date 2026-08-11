import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getClientById } from "@/services/client-service";
import { getProjectAccessRole, getProjectById, updateProject } from "@/services/project-service";
import { ProjectStatus } from "@/types/project";

type UpdateProjectPayload = {
  clientId?: string | null;
  name?: string;
  description?: string;
  tags?: string[];
  context?: string;
  objective?: string;
  stakeholders?: string;
  maturity?: string;
  status?: ProjectStatus;
};

function isValidStatus(value?: string): value is ProjectStatus {
  return value === undefined || ["ativo", "pausado", "arquivado"].includes(value);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { projectId } = await context.params;
    const project = await getProjectById({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: projectId.trim(),
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[/api/projects/[projectId]] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar projeto." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as UpdateProjectPayload;
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Status de projeto invalido." }, { status: 400 });
    }
    if (body.clientId !== undefined && body.clientId !== null && body.clientId.trim()) {
      const existingClient = await getClientById({
        userId: auth.context.organizationId,
        clientId: body.clientId.trim(),
      });
      if (!existingClient) {
        return NextResponse.json({ error: "Cliente nao encontrado para vinculo no projeto." }, { status: 404 });
      }
    }

    const { projectId } = await context.params;
    const accessRole = await getProjectAccessRole({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: projectId.trim(),
    });
    if (accessRole === "none") {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }
    if (accessRole === "viewer") {
      return NextResponse.json(
        { error: "Sem permissao para editar este projeto. Solicite acesso como editor ou owner." },
        { status: 403 },
      );
    }

    const updated = await updateProject({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: projectId.trim(),
      patch: {
        clientId: body.clientId === undefined ? undefined : body.clientId?.trim() || null,
        name: body.name,
        description: body.description,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
        context: body.context,
        objective: body.objective,
        stakeholders: body.stakeholders,
        maturity: body.maturity,
        status: body.status,
      },
    });

    if (!updated) {
      return NextResponse.json({ error: "Projeto nao encontrado para atualizacao." }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[/api/projects/[projectId]] PATCH error", error);
    const message = error instanceof Error ? error.message : "Erro ao atualizar projeto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
