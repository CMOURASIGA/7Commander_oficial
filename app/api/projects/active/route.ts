import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getActiveProject, setActiveProject } from "@/services/project-service";

type ActivatePayload = {
  projectId: string;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const active = await getActiveProject(auth.context.organizationId, auth.context.userEmail);
    return NextResponse.json({ data: active });
  } catch (error) {
    console.error("[/api/projects/active] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar projeto ativo." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as ActivatePayload;
    if (!body.projectId?.trim()) {
      return NextResponse.json({ error: "Campo 'projectId' obrigatorio." }, { status: 400 });
    }

    const updated = await setActiveProject({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: body.projectId.trim(),
    });
    if (!updated) {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[/api/projects/active] PATCH error", error);
    return NextResponse.json({ error: "Erro ao ativar projeto." }, { status: 500 });
  }
}
