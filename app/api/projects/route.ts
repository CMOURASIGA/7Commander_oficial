import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createProject, getActiveProject, listProjects } from "@/services/project-service";
import { ensureProjectOwnerMembership } from "@/services/project-sharing-service";
import { getClientById } from "@/services/client-service";
import { ProjectStatus } from "@/types/project";

type CreateProjectPayload = {
  clientId?: string | null;
  name: string;
  description?: string;
  tags?: string[];
  context?: string;
  objective?: string;
  stakeholders?: string;
  maturity?: string;
  status?: ProjectStatus;
  isActive?: boolean;
};

function isValidStatus(value?: string): value is ProjectStatus {
  return value === undefined || ["ativo", "pausado", "arquivado"].includes(value);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const [projects, activeProject] = await Promise.all([
      listProjects(auth.context.organizationId, auth.context.userEmail),
      getActiveProject(auth.context.organizationId, auth.context.userEmail),
    ]);

    return NextResponse.json({
      data: projects,
      meta: {
        activeProjectId: activeProject?.id ?? null,
      },
    });
  } catch (error) {
    console.error("[/api/projects] GET error", error);
    return NextResponse.json({ error: "Erro ao listar projetos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as CreateProjectPayload;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Campo 'name' obrigatorio." }, { status: 400 });
    }
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Status de projeto invalido." }, { status: 400 });
    }
    const clientId = body.clientId?.trim() || null;
    if (clientId) {
      const existingClient = await getClientById({
        userId: auth.context.organizationId,
        clientId,
      });
      if (!existingClient) {
        return NextResponse.json({ error: "Cliente nao encontrado para vinculo no projeto." }, { status: 404 });
      }
    }

    const project = await createProject({
      userId: auth.context.organizationId,
      clientId,
      name: body.name.trim(),
      description: body.description,
      tags: Array.isArray(body.tags) ? body.tags : [],
      context: body.context,
      objective: body.objective,
      stakeholders: body.stakeholders,
      maturity: body.maturity,
      status: body.status ?? "ativo",
      isActive: Boolean(body.isActive),
    });

    await ensureProjectOwnerMembership({
      ownerUserId: auth.context.organizationId,
      ownerEmail: auth.context.userEmail,
      projectId: project.id,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("[/api/projects] POST error", error);
    return NextResponse.json({ error: "Erro ao criar projeto." }, { status: 500 });
  }
}
